import StudentHub from "@/components/StudentHub";
import { readPublished } from "@/lib/content";
import SitePage, { EmptySite } from "@/components/SitePage";

export const dynamic = "force-dynamic";

export default async function Page() {
  if (process.env.SITE_EXPERIENCE === "student-hub") return <StudentHub />;
  const env = process.env.SITE_ENV;
  const published = await readPublished();
  if (published.notDeployed) return <EmptySite env={env} />;
  return (
    <SitePage
      content={published.content}
      env={env}
      version={process.env.APP_VERSION}
    />
  );
}
