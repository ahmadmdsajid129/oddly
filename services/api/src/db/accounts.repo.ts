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

export class AccountsRepository {
  /**
   * Finds an account by Google Subject ID (unique sub).
   */
  static async findByGoogleSub(googleSub: string) {
    return await prisma.account.findUnique({
      where: { google_sub: googleSub },
      include: {
        players: true,
      },
    });
  }

  /**
   * Finds an account by UUID.
   */
  static async findById(id: string) {
    return await prisma.account.findUnique({
      where: { id },
      include: {
        players: true,
      },
    });
  }

  /**
   * Finds an account by SHA-256 hashed email.
   */
  static async findByEmailHash(emailHash: string) {
    return await prisma.account.findFirst({
      where: { email_hash: emailHash },
    });
  }

  /**
   * Creates a new user account.
   */
  static async createAccount(data: CreateAccountInput) {
    return await prisma.account.create({
      data: {
        google_sub: data.googleSub,
        email_hash: data.emailHash,
        display_name: data.displayName,
      },
    });
  }

  /**
   * Links a player (device) to an account.
   */
  static async linkPlayerToAccount(playerId: string, accountId: string) {
    return await prisma.player.update({
      where: { id: playerId },
      data: { account_id: accountId },
    });
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
    let guestPlayer = null;
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

    if (!guestPlayer) {
      return {
        merged: false,
        mergedSubmissionsCount: 0,
        currentStreak: 0,
        playerId: guestPlayerId || "",
      };
    }

    // 2. Link player device to the account
    await prisma.player.update({
      where: { id: guestPlayer.id },
      data: { account_id: accountId },
    });

    // 3. Find all linked players under this account
    const allLinkedPlayers = await prisma.player.findMany({
      where: { account_id: accountId },
      include: {
        submissions: {
          include: {
            drop: true,
          },
        },
      },
    });

    // 4. Gather all distinct drop dates across all linked devices
    const distinctDates = new Set<string>();
    let totalSubmissionsCount = 0;

    for (const player of allLinkedPlayers) {
      totalSubmissionsCount += player.submissions.length;
      for (const sub of player.submissions) {
        if (sub.drop?.drop_date) {
          const dateStr = sub.drop.drop_date.toISOString().slice(0, 10);
          distinctDates.add(dateStr);
        }
      }
    }

    // 5. Recalculate official streak across merged submission dates
    const streakResult = calculateStreak(Array.from(distinctDates));

    // 6. Record or update streak log
    try {
      await prisma.streakLog.create({
        data: {
          player_id: guestPlayer.id,
          date_ist: new Date().toISOString().slice(0, 10),
          length: streakResult.currentStreak,
        },
      });
    } catch {
      // Non-blocking streak log recording
    }

    return {
      merged: true,
      mergedSubmissionsCount: totalSubmissionsCount,
      currentStreak: streakResult.currentStreak,
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
    }

    return { isSuspicious: false };
  }
}
