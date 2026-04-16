import { DashboardLayout } from '../../../components/layout/DashboardLayout';

export default function EventCompanyDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}

