import { AdminUser, getAdmins } from "@/api";
import { DataTable } from "@/components/data-table";
import { UserAvatar } from "@/components/user-avatar";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { createColumnHelper } from "@tanstack/react-table";
import { format, fromUnixTime, getUnixTime, parseISO } from "date-fns";

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
      <section>
        <h1>Admins</h1>
        <p>
          Admin users can log into this console to manage the <em>LLM Service</em>&apos;s
          components, including: available models, API users and their API keys, and admin users
          themselves.
        </p>
      </section>
      <section className="mt-10">
        {isPending && <div className="p-4 flex justify-center">Loading...</div>}
        {isError && (
          <div className="p-4 rounded-xl bg-destructive text-destructive-foreground text-center">
            {`Unable to retrieve admin list: ${error.message}`}
          </div>
        )}
        {data && (
          <>
            <p className="text-xl text-muted-foreground pb-4">Found {data.count} admins</p>
            <DataTable columns={columns} data={data.admins} />
          </>
        )}
      </section>
    </>
  );
}
