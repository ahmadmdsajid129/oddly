import { Metadata } from "next";
import ChallengeClientView from "./ChallengeClientView";

interface PageProps {
  params: { shortId: string };
  searchParams: { challenge?: string };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const shortId = params.shortId;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oddly.app";

  return {
    title: `Oddly — Can you beat my stranger twin match?`,
    description:
      "I found my stranger twin on Oddly today. Answer the 5 daily questions to see how you compare!",
    openGraph: {
      title: "Oddly — Can you beat my match?",
      description:
        "Daily 5-pick game matching you with your stranger twin across the globe.",
      url: `${baseUrl}/c/${shortId}`,
      siteName: "Oddly",
      images: [
        {
          url: `${baseUrl}/v1/cards/${shortId}/link.png`,
          width: 1200,
          height: 630,
          alt: "Oddly Share Card",
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Oddly — Beat my stranger twin match!",
      description: "Answer today's 5 questions and see our pick comparison.",
      images: [`${baseUrl}/v1/cards/${shortId}/link.png`],
    },
  };
}

export default function ChallengePage({ params, searchParams }: PageProps) {
  const isChallenge = searchParams.challenge === "1" || searchParams.challenge === "true";

  return (
    <ChallengeClientView
      shortId={params.shortId}
      isChallengeMode={isChallenge}
    />
  );
}
