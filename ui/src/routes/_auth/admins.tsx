import { AdminUser, getAdmins } from "@/api";
import { TableSkeleton } from "@/components/app-skeletons";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import { format, fromUnixTime, getUnixTime, parseISO } from "date-fns";
import { CirclePlus } from "lucide-react";

export const Route = createFileRoute("/_auth/admins")({
  component: AdminUsers,
  staticData: {
    breadcrumbLabel: "Manage Admins",
  },
});

const columnHelper = createColumnHelper<AdminUser>();

const columns = [
  columnHelper.display({
    id: "avatar",
    cell: ({ row }) => <UserAvatar userId={row.original.id} userName={row.original.name} />,
  }),
  columnHelper.accessor("name", {
    header: "Name",
  }),
  columnHelper.accessor("email", {
    header: "Email",
  }),
  columnHelper.accessor((row) => getUnixTime(parseISO(row.createdAt)), {
    id: "createdAt",
    header: "Created",
    cell: (props) => <span>{format(fromUnixTime(props.getValue()), "PPp")}</span>,
  }),
  columnHelper.accessor((row) => getUnixTime(parseISO(row.updatedAt)), {
    id: "updatedAt",
    header: "Updated",
    cell: (props) => <span>{format(fromUnixTime(props.getValue()), "PPp")}</span>,
  }),
];

function AdminUsers() {
  const { isPending, isError, data, error } = useQuery({
    queryKey: ["admins"],
    queryFn: getAdmins,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <>
      <section className="typography">
        <header className="flex justify-between">
          <h1>Admins</h1>
          <Button asChild>
            <Link from={Route.fullPath} to="new">
              <CirclePlus /> Create admin
            </Link>
          </Button>
        </header>
        <p>
          Admin users can log into this console to manage the <em>LLM Service</em>&apos;s
          components, including: available models, API users and their API keys, and admin users
          themselves.
        </p>
      </section>
      <section className="mt-10">
        <p className="text-xl text-muted-foreground pb-4">
          {data ? `Found ${data.count} admins` : "Loading admins..."}
        </p>
        {isPending && <TableSkeleton />}
        {isError && (
          <div className="p-4 rounded-xl bg-destructive text-destructive-foreground text-center">
            {`Unable to retrieve admin list: ${error.message}`}
          </div>
        )}
        {data && <DataTable columns={columns} data={data.admins} />}
      </section>
      <Outlet />
    </>
  );
}
