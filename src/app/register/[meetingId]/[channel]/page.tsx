import { RegisterPage } from "@/components/RegisterPage";

type PageProps = {
  params: Promise<{ meetingId: string; channel: "internal" | "external" }>;
};

export default async function Page({ params }: PageProps) {
  const { meetingId, channel } = await params;
  return <RegisterPage channel={channel} meetingId={meetingId} />;
}
