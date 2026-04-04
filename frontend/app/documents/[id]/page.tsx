import { redirect } from 'next/navigation';

interface LegacyDocumentPageProps {
  params: Promise<{
    id: string;
  }>;
}

const LegacyDocumentPage = async ({ params }: LegacyDocumentPageProps) => {
  const { id } = await params;
  redirect(`/whiteboards/${id}`);
};

export default LegacyDocumentPage;
