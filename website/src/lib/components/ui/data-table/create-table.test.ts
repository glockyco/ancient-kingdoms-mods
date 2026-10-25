import { describe, expect, it } from "vitest";
import {
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
} from "@tanstack/table-core";
import { createSvelteTable, toggleSingleColumnSorting } from "./create-table";

describe("single-column header sorting", () => {
  it("replaces the default sort keys and reverses only the primary column", () => {
    let sorting: SortingState = [
      { id: "level", desc: true },
      { id: "name", desc: false },
    ];
    const table = createSvelteTable({
      data: [{ name: "Example", level: 10 }],
      columns: [{ accessorKey: "level" }, { accessorKey: "name" }],
      getCoreRowModel: getCoreRowModel(),
      state: { sorting },
      onSortingChange: (updater) => {
        sorting = typeof updater === "function" ? updater(sorting) : updater;
        table.setOptions((options) => ({
          ...options,
          state: { ...options.state, sorting },
        }));
      },
    });

    // Name was a later key, so the first click starts it A to Z.
    toggleSingleColumnSorting(table, "name");
    expect(sorting).toEqual([{ id: "name", desc: false }]);
    toggleSingleColumnSorting(table, "name");
    expect(sorting).toEqual([{ id: "name", desc: true }]);
    // A number column starts highest first.
    toggleSingleColumnSorting(table, "level");
    expect(sorting).toEqual([{ id: "level", desc: true }]);
    toggleSingleColumnSorting(table, "level");
    expect(sorting).toEqual([{ id: "level", desc: false }]);
  });
});

it("formats default numeric cells without changing numeric sorting values", () => {
  const table = createSvelteTable({
    data: [{ amount: 10000 }, { amount: 999 }, { amount: 1234.56789 }],
    columns: [{ accessorKey: "amount" }],
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { sorting: [{ id: "amount", desc: false }] },
  });
  const cells = table.getRowModel().rows.map((row) => row.getAllCells()[0]);
  expect(cells.map((cell) => cell.getValue())).toEqual([
    999, 1234.56789, 10000,
  ]);
  expect(
    cells.map((cell) => {
      const render = cell.column.columnDef.cell;
      return typeof render === "function" ? render(cell.getContext()) : render;
    }),
  ).toEqual(["999", "1\u202F234.56789", "10\u202F000"]);
});
