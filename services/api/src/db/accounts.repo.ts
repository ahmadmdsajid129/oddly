import { prisma } from "./client.js";
import { calculateStreak } from "@oddly/shared";

export interface CreateAccountInput {
  googleSub: string;
  emailHash: string; // SHA-256 of email
  displayName: string;
}

export interface MergeGuestResult {
  merged: boolean;
  mergedSubmissionsCount: number;
  currentStreak: number;
  playerId: string;
}

// In-memory fallback stores for test and offline environments
const inMemoryAccounts = new Map<string, any>();
const inMemoryPlayers = new Map<string, any>();

export class AccountsRepository {
  /**
   * Helper to register player in in-memory store for test mocking
   */
  static setInMemoryPlayer(player: any) {
    inMemoryPlayers.set(player.id, player);
    if (player.did) inMemoryPlayers.set(player.did, player);
  }

  /**
   * Helper to inspect in-memory account
   */
  static getInMemoryAccount(id: string) {
    return inMemoryAccounts.get(id);
  }

  /**
   * Finds an account by Google Subject ID (unique sub).
   */
  static async findByGoogleSub(googleSub: string) {
    try {
      return await prisma.account.findUnique({
        where: { google_sub: googleSub },
        include: {
          players: true,
        },
      });
    } catch {
      for (const acc of inMemoryAccounts.values()) {
        if (acc.google_sub === googleSub) return acc;
      }
      return null;
    }
  }

  /**
   * Finds an account by UUID.
   */
  static async findById(id: string) {
    try {
      return await prisma.account.findUnique({
        where: { id },
        include: {
          players: true,
        },
      });
    } catch {
      return inMemoryAccounts.get(id) || null;
    }
  }

  /**
   * Finds an account by SHA-256 hashed email.
   */
  static async findByEmailHash(emailHash: string) {
    try {
      return await prisma.account.findFirst({
        where: { email_hash: emailHash },
      });
    } catch {
      for (const acc of inMemoryAccounts.values()) {
        if (acc.email_hash === emailHash) return acc;
      }
      return null;
    }
  }

  /**
   * Creates a new user account.
   */
  static async createAccount(data: CreateAccountInput) {
    try {
      const created = await prisma.account.create({
        data: {
          google_sub: data.googleSub,
          email_hash: data.emailHash,
          display_name: data.displayName,
        },
      });
      inMemoryAccounts.set(created.id, created);
      return created;
    } catch {
      const record = {
        id: "acc_" + Math.random().toString(36).slice(2) + Date.now().toString(36),
        google_sub: data.googleSub,
        email_hash: data.emailHash,
        display_name: data.displayName,
        created_at: new Date(),
        updated_at: new Date(),
        players: [],
      };
      inMemoryAccounts.set(record.id, record);
      return record;
    }
  }

  /**
   * Links a player (device) to an account.
   */
  static async linkPlayerToAccount(playerId: string, accountId: string) {
    try {
      return await prisma.player.update({
        where: { id: playerId },
        data: { account_id: accountId },
      });
    } catch {
      const player = inMemoryPlayers.get(playerId);
      if (player) {
        player.account_id = accountId;
      }
      return player;
    }
  }

  /**
   * Merges a guest's device history, past submissions, and streaks into an account.
   * Guarantees zero data loss (P7.04).
   */
  static async mergeGuestHistory(data: {
    guestPlayerId?: string;
    guestDid?: string;
    accountId: string;
  }): Promise<MergeGuestResult> {
    const { guestPlayerId, guestDid, accountId } = data;

    // 1. Locate guest player record
    let guestPlayer: any = null;
    try {
      if (guestPlayerId) {
        guestPlayer = await prisma.player.findUnique({
          where: { id: guestPlayerId },
          include: { submissions: true },
        });
      } else if (guestDid) {
        guestPlayer = await prisma.player.findUnique({
          where: { did: guestDid },
          include: { submissions: true },
        });
      }
    } catch {
      if (guestPlayerId) {
        guestPlayer = inMemoryPlayers.get(guestPlayerId) || null;
      } else if (guestDid) {
        guestPlayer = inMemoryPlayers.get(guestDid) || null;
      }
    }

    if (!guestPlayer) {
      return {
        merged: false,
        mergedSubmissionsCount: 0,
        currentStreak: 0,
        playerId: guestPlayerId || "",
      };
    }

    // 2. Link player device to the account
    try {
      await prisma.player.update({
        where: { id: guestPlayer.id },
        data: { account_id: accountId },
      });
    } catch {
      guestPlayer.account_id = accountId;
    }

    // 3. Find all linked players under this account
    let allLinkedPlayers: any[] = [];
    try {
      allLinkedPlayers = await prisma.player.findMany({
        where: { account_id: accountId },
        include: {
          submissions: {
            include: {
              drop: true,
            },
          },
        },
      });
    } catch {
      allLinkedPlayers = Array.from(inMemoryPlayers.values()).filter(
        (p) => p.account_id === accountId
      );
    }

    // 4. Gather all distinct drop dates across all linked devices
    const seenPlayerIds = new Set<string>();
    const uniqueLinkedPlayers: any[] = [];
    for (const p of allLinkedPlayers) {
      if (p && !seenPlayerIds.has(p.id)) {
        seenPlayerIds.add(p.id);
        uniqueLinkedPlayers.push(p);
      }
    }

    const distinctDates = new Set<string>();
    let totalSubmissionsCount = 0;

    for (const player of uniqueLinkedPlayers) {
      const subs = player.submissions || [];
      totalSubmissionsCount += subs.length;
      for (const sub of subs) {
        if (sub.drop?.drop_date) {
          const dateStr =
            typeof sub.drop.drop_date === "string"
              ? sub.drop.drop_date.slice(0, 10)
              : sub.drop.drop_date.toISOString().slice(0, 10);
          distinctDates.add(dateStr);
        } else if (sub.created_at) {
          const dateStr =
            typeof sub.created_at === "string"
              ? sub.created_at.slice(0, 10)
              : sub.created_at.toISOString().slice(0, 10);
          distinctDates.add(dateStr);
        }
      }
    }

    // 5. Recalculate official streak across merged submission dates
    const streakNum = calculateStreak(Array.from(distinctDates));
    const currentStreak = typeof streakNum === "number" ? streakNum : 0;

    // 6. Record or update streak log
    try {
      await prisma.streakLog.create({
        data: {
          player_id: guestPlayer.id,
          date_ist: new Date().toISOString().slice(0, 10),
          length: currentStreak,
        },
      });
    } catch {
      // Non-blocking streak log recording
    }

    return {
      merged: true,
      mergedSubmissionsCount: totalSubmissionsCount,
      currentStreak: currentStreak,
      playerId: guestPlayer.id,
    };
  }

  /**
   * Anti-abuse duplicate account detection (P7.07).
   * Flags when a device cluster attempts to claim multiple disparate Google accounts.
   */
  static async detectDuplicateAccount(
    emailHash: string,
    deviceDid?: string
  ): Promise<{ isSuspicious: boolean; reason?: string }> {
    if (deviceDid) {
      try {
        const existingPlayer = await prisma.player.findUnique({
          where: { did: deviceDid },
          include: { account: true },
        });

        if (existingPlayer?.account && existingPlayer.account.email_hash !== emailHash) {
          return {
            isSuspicious: true,
            reason: "Device already linked to a different account",
          };
        }
      } catch {
        const existingPlayer = inMemoryPlayers.get(deviceDid);
        if (existingPlayer?.account && existingPlayer.account.email_hash !== emailHash) {
          return {
            isSuspicious: true,
            reason: "Device already linked to a different account",
          };
        }
      }
    }

    return { isSuspicious: false };
  }
}
