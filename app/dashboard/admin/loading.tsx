import { Skeleton } from "@/components/ui";

export default function AdminLoading() {
  return (
    <main className="dashboard-main admin-workspace" aria-busy="true" aria-live="polite">
      <div className="dashboard-content admin-loading-state" role="status" aria-label="A carregar a área administrativa">
        <span className="dashboard-kicker">MozEmpresas · Administração</span>
        <Skeleton width="min(360px, 70%)" height={34} />
        <Skeleton width="min(620px, 90%)" height={14} />
        <div className="admin-loading-metrics">
          {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} height={94} />)}
        </div>
        <Skeleton height={250} />
      </div>
    </main>
  );
}
