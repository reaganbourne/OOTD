import { OutfitDetailView } from "@/components/outfits/outfit-detail-view";

export default async function OutfitDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <OutfitDetailView id={id} />;
}
