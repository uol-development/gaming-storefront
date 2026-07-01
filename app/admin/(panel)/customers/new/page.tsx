import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CustomerForm } from "@/components/admin/customers/customer-form";

export const metadata = { title: "New customer" };
export const dynamic = "force-dynamic";

export default function NewCustomerPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" />
          Back to customers
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">New customer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manually add a customer record. Customers are also created automatically at checkout.
        </p>
      </div>

      <CustomerForm mode="create" />
    </div>
  );
}
