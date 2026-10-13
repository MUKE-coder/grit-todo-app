import TodoForm from "@/components/forms/TodoForm";

import { getPublicTodos } from "@/lib/todos-public";

export default async function HomePage() {
  const { data: todos = [] } = await getPublicTodos();
  // console.log(todos);
  return (
    <div className="flex flex-col container max-w-6xl mx-auto">
      <section className="py-8">
        <div className="flex justify-between mb-8">
          <h2 className="text-xl font-black">Todo List</h2>
          <div className="">
            <TodoForm />
          </div>
        </div>

        <div className="relative overflow-x-auto bg-neutral-primary-soft shadow-xs rounded-base border border-default">
          <table className="w-full text-sm text-left rtl:text-right text-body">
            <thead className="text-sm text-body bg-neutral-secondary-soft border-b rounded-base border-default">
              <tr>
                <th scope="col" className="px-6 py-3 font-medium">
                  Todo name
                </th>
                <th scope="col" className="px-6 py-3 font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {todos && todos.length > 0 ? (
                todos.map((todo) => {
                  return (
                    <tr
                      key={todo.id}
                      className="bg-neutral-primary border-b border-default"
                    >
                      <th
                        scope="row"
                        className="px-6 py-4 font-medium text-heading whitespace-nowrap"
                      >
                        {todo.title}
                      </th>
                      <td className="px-6 py-4">{todo.completed}</td>
                    </tr>
                  );
                })
              ) : (
                <div className="">No</div>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
