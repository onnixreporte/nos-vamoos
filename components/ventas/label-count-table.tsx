"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LabelCountTableProps {
  title: string;
  subtitle?: string;
  data: { label: string; count: number }[];
}

export function LabelCountTable({ title, subtitle, data }: LabelCountTableProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card>
      <CardHeader className="space-y-1 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-2 font-medium">Nombre</th>
                <th className="py-2 px-2 text-right font-medium">Cantidad</th>
                <th className="py-2 pl-2 text-right font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td className="py-3 text-xs text-muted-foreground" colSpan={3}>
                    Sin datos para el rango seleccionado.
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.label} className="border-b last:border-0">
                    <td className="py-2 pr-2">{item.label}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{item.count}</td>
                    <td className="py-2 pl-2 text-right tabular-nums">
                      {total > 0 ? `${((item.count / total) * 100).toFixed(1)}%` : "0.0%"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
