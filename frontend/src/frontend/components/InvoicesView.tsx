import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { billingService, type Invoice, type RevenueReportItem } from "../services/billing";
import { authService, type AuthUser } from "../services/auth";
import { Loader2, Plus, RefreshCw, Search, FileText, CheckCircle2, AlertCircle, Clock } from "lucide-react";

const InvoicesView = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // States for stats
  const [allInvoicesForStats, setAllInvoicesForStats] = useState<Invoice[]>([]);

  // Filter State
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "PAID" | "OVERDUE">("ALL");

  // Create Invoice State
  const [createOpen, setCreateOpen] = useState(false);
  const [newMemberId, setNewMemberId] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [usersList, setUsersList] = useState<AuthUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Report State
  const [reportPeriod, setReportPeriod] = useState<"daily" | "monthly" | "yearly">("monthly");
  const [reportFrom, setReportFrom] = useState("2026-01-01T00:00:00Z");
  const [reportTo, setReportTo] = useState("2026-12-31T23:59:59Z");
  const [reports, setReports] = useState<RevenueReportItem[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);

  // Search Member State
  const [searchMemberId, setSearchMemberId] = useState("");
  const [memberInvoices, setMemberInvoices] = useState<Invoice[]>([]);
  const [loadingMember, setLoadingMember] = useState(false);
  const [memberSearched, setMemberSearched] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await billingService.getInvoices(page, 10);
      setInvoices(response.content);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);

      // Fetch a larger page size to calculate global metrics
      const statsResponse = await billingService.getInvoices(0, 1000);
      setAllInvoicesForStats(statsResponse.content);
    } catch (error) {
      toast.error("Error al cargar las facturas");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchInvoices();
  }, [page]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const me = await authService.me();
        setCurrentUser(me);
        
        if (me.role !== "admin") {
          setNewMemberId(me.id);
          setSearchMemberId(me.id);
          setLoadingMember(true);
          try {
            const res = await billingService.getMemberHistory(me.id, 0, 100);
            setMemberInvoices((res as any).invoices ?? res.content ?? []);
            setMemberSearched(true);
          } catch (err) {
            console.error(err);
          } finally {
            setLoadingMember(false);
          }
        } else {
          setLoadingUsers(true);
          const list = await authService.listUsers();
          setUsersList(list);
        }
      } catch (err) {
        console.error("Error cargando datos de usuario/miembros:", err);
      } finally {
        setLoadingUsers(false);
      }
    };
    void fetchUserData();
  }, []);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberId || !newAmount || !newDescription || !newDueDate) {
      toast.error("Por favor complete todos los campos");
      return;
    }

    setCreating(true);
    try {
      // Parse local date from input YYYY-MM-DD
      const [year, month, day] = newDueDate.split("-").map(Number);
      const localDate = new Date(year, month - 1, day);
      
      // If the selected date is today, set to 23:59:59 to avoid falling in the past.
      const today = new Date();
      if (localDate.toDateString() === today.toDateString()) {
        localDate.setHours(23, 59, 59, 999);
      } else {
        localDate.setHours(12, 0, 0, 0);
      }
      
      const formattedDueDate = localDate.toISOString();
      await billingService.createInvoice({
        memberId: newMemberId,
        amount: parseFloat(newAmount),
        description: newDescription,
        dueDate: formattedDueDate,
      });
      toast.success("Factura creada con éxito");
      setCreateOpen(false);
      // Reset form
      if (currentUser?.role === "admin") {
        setNewMemberId("");
      }
      setNewAmount("");
      setNewDescription("");
      setNewDueDate("");
      void fetchInvoices();
    } catch (error) {
      if (error && typeof error === "object" && "details" in error && Array.isArray((error as any).details)) {
        const detailsList = (error as any).details.join(", ");
        toast.error(`Error de validación: ${detailsList}`);
      } else {
        toast.error(error instanceof Error ? error.message : "Error al crear la factura");
      }
    } finally {
      setCreating(false);
    }
  };

  const handlePayInvoice = async (id: string) => {
    try {
      await billingService.payInvoice(id);
      toast.success("Factura marcada como pagada");
      void fetchInvoices();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al procesar el pago");
    }
  };

  const handleSweepOverdue = async () => {
    try {
      const res = await billingService.sweepOverdue();
      toast.success(`Facturación actualizada: ${res.updatedCount} facturas marcadas como vencidas`);
      void fetchInvoices();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al barrer facturas");
    }
  };

  const handleGenerateReport = async () => {
    setLoadingReport(true);
    try {
      const fromISO = new Date(reportFrom).toISOString();
      const toISO = new Date(reportTo).toISOString();
      const data = await billingService.getRevenueReport(reportPeriod, fromISO, toISO);
      setReports(data);
      toast.success("Reporte generado correctamente");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al generar reporte");
    } finally {
      setLoadingReport(false);
    }
  };

  const handleSearchMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchMemberId) return;

    setLoadingMember(true);
    try {
      const res = await billingService.getMemberHistory(searchMemberId, 0, 100);
      setMemberInvoices((res as any).invoices ?? res.content ?? []);
      setMemberSearched(true);
    } catch (error) {
      toast.error("No se pudo obtener el historial del miembro. Valide el ID.");
    } finally {
      setLoadingMember(false);
    }
  };

  // Compute metrics from stats list
  const metrics = {
    total: allInvoicesForStats.reduce((sum, inv) => sum + inv.amount, 0),
    paid: allInvoicesForStats.filter(i => i.status === "PAID").reduce((sum, inv) => sum + inv.amount, 0),
    pending: allInvoicesForStats.filter(i => i.status === "PENDING").reduce((sum, inv) => sum + inv.amount, 0),
    overdue: allInvoicesForStats.filter(i => i.status === "OVERDUE").reduce((sum, inv) => sum + inv.amount, 0),
  };

  // Client side filtering for currently loaded page
  const filteredInvoices = invoices.filter(inv => {
    if (statusFilter === "ALL") return true;
    return inv.status === statusFilter;
  });

  const getStatusBadge = (status: Invoice["status"]) => {
    switch (status) {
      case "PAID":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-mono"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> PAGADA</Badge>;
      case "OVERDUE":
        return <Badge className="bg-rose/10 text-rose border border-rose/20 font-mono"><AlertCircle className="w-3.5 h-3.5 mr-1" /> VENCIDA</Badge>;
      case "PENDING":
      default:
        return <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 font-mono"><Clock className="w-3.5 h-3.5 mr-1" /> PENDIENTE</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-paper-deep border border-paper-muted rounded-3xl p-6 md:p-8 shadow-sm">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-ink-soft bg-paper px-3 py-1 rounded-full">💵 Facturación y Finanzas</span>
          <h1 className="font-heading text-4xl text-ink font-semibold tracking-tight mt-3">Panel de Facturas</h1>
          <p className="font-body text-ink-soft text-sm mt-2 max-w-xl">
            Gestiona el ciclo de vida de cobros y visualiza los reportes financieros agregados de la plataforma de coworking.
          </p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button
            onClick={handleSweepOverdue}
            variant="outline"
            className="flex-1 md:flex-none border-paper-muted hover:bg-paper font-body text-sm rounded-xl"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Barrido de Vencimientos
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            className="flex-1 md:flex-none bg-coral hover:bg-coral/95 text-white font-body text-sm rounded-xl shadow-md transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4 mr-2" /> Nueva Factura
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Total Facturado", val: metrics.total, color: "text-ink" },
          { title: "Cobrado con éxito", val: metrics.paid, color: "text-emerald-600" },
          { title: "Monto Pendiente", val: metrics.pending, color: "text-amber-600" },
          { title: "Monto Vencido", val: metrics.overdue, color: "text-rose" },
        ].map((item, idx) => (
          <Card key={idx} className="bg-paper-deep border-paper-muted rounded-2xl shadow-sm transition-all duration-300 hover:shadow-md hover:translate-y-[-2px]">
            <CardHeader className="pb-2">
              <CardDescription className="font-body text-xs text-ink-soft">{item.title}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className={`font-heading text-2xl sm:text-3xl font-semibold tracking-tight ${item.color}`}>
                ${item.val.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="invoices" className="space-y-6">
        <TabsList className="bg-paper border border-paper-muted p-1 rounded-xl w-full max-w-md grid grid-cols-3">
          <TabsTrigger value="invoices" className="rounded-lg font-body text-xs sm:text-sm data-[state=active]:bg-paper-deep data-[state=active]:text-coral data-[state=active]:shadow-sm">
            Facturas
          </TabsTrigger>
          <TabsTrigger value="reports" className="rounded-lg font-body text-xs sm:text-sm data-[state=active]:bg-paper-deep data-[state=active]:text-coral data-[state=active]:shadow-sm">
            Reportes
          </TabsTrigger>
          <TabsTrigger value="member" className="rounded-lg font-body text-xs sm:text-sm data-[state=active]:bg-paper-deep data-[state=active]:text-coral data-[state=active]:shadow-sm">
            Por Miembro
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Invoices List */}
        <TabsContent value="invoices" className="space-y-4">
          <Card className="bg-paper-deep border-paper-muted rounded-3xl shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-paper-muted pb-4">
              <div>
                <CardTitle className="font-heading text-xl">Listado de Cobros</CardTitle>
                <CardDescription className="font-body text-xs text-ink-soft">Muestra las facturas emitidas por la administración.</CardDescription>
              </div>
              <div className="flex gap-2">
                {["ALL", "PENDING", "PAID", "OVERDUE"].map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={statusFilter === status ? "default" : "outline"}
                    onClick={() => setStatusFilter(status as any)}
                    className={`text-xs rounded-lg font-body ${
                      statusFilter === status
                        ? "bg-coral text-white hover:bg-coral/90"
                        : "border-paper-muted hover:bg-paper"
                    }`}
                  >
                    {status === "ALL" ? "Todos" : status === "PENDING" ? "Pendientes" : status === "PAID" ? "Pagadas" : "Vencidas"}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex flex-col justify-center items-center py-20 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-coral" />
                  <p className="font-body text-xs text-ink-soft">Cargando facturas...</p>
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className="text-center py-20 space-y-3">
                  <FileText className="w-12 h-12 mx-auto text-ink-faint" />
                  <p className="font-body text-sm text-ink-soft">No se encontraron facturas con este estado.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-paper/40">
                      <TableRow className="border-paper-muted">
                        <TableHead className="font-body text-xs text-ink-soft py-4 pl-6">ID Factura</TableHead>
                        <TableHead className="font-body text-xs text-ink-soft">Miembro ID</TableHead>
                        <TableHead className="font-body text-xs text-ink-soft">Descripción</TableHead>
                        <TableHead className="font-body text-xs text-ink-soft text-right">Monto</TableHead>
                        <TableHead className="font-body text-xs text-ink-soft">Vencimiento</TableHead>
                        <TableHead className="font-body text-xs text-ink-soft">Estado</TableHead>
                        <TableHead className="font-body text-xs text-ink-soft text-right pr-6">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.map((inv) => (
                        <TableRow key={inv.id} className="border-paper-muted hover:bg-paper/20">
                          <TableCell className="font-mono text-xs text-ink py-4 pl-6 truncate max-w-[120px]" title={inv.id}>
                            {inv.id}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-ink truncate max-w-[120px]" title={inv.memberId}>
                            {inv.memberId}
                          </TableCell>
                          <TableCell className="font-body text-xs text-ink-soft">{inv.description}</TableCell>
                          <TableCell className="font-mono text-xs text-ink text-right font-semibold">
                            ${inv.amount.toFixed(2)}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-ink-soft">
                            {new Date(inv.dueDate).toLocaleDateString("es-ES")}
                          </TableCell>
                          <TableCell>{getStatusBadge(inv.status)}</TableCell>
                          <TableCell className="text-right pr-6">
                            {inv.status === "PENDING" && (
                              <Button
                                size="sm"
                                onClick={() => handlePayInvoice(inv.id)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-body text-xs rounded-lg shadow-sm"
                              >
                                Pagar
                              </Button>
                            )}
                            {inv.status !== "PENDING" && <span className="font-body text-xs text-ink-faint">-</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            {totalPages > 1 && (
              <CardContent className="border-t border-paper-muted p-4 flex justify-between items-center">
                <p className="font-body text-xs text-ink-soft">
                  Página {page + 1} de {totalPages} ({totalElements} facturas)
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page === 0}
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    className="border-paper-muted hover:bg-paper rounded-lg"
                  >
                    Anterior
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                    className="border-paper-muted hover:bg-paper rounded-lg"
                  >
                    Siguiente
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        {/* Tab 2: Reports */}
        <TabsContent value="reports" className="space-y-4">
          <Card className="bg-paper-deep border-paper-muted rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-xl">Reporte de Ingresos</CardTitle>
              <CardDescription className="font-body text-xs text-ink-soft">Consulta un resumen de la recaudación por rangos de fecha.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Report Query Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-paper/30 border border-paper-muted rounded-2xl">
                <div className="space-y-1">
                  <Label className="font-body text-xs text-ink-soft">Período</Label>
                  <Select value={reportPeriod} onValueChange={(v: any) => setReportPeriod(v)}>
                    <SelectTrigger className="bg-paper-deep border-paper-muted rounded-lg text-xs font-body">
                      <SelectValue placeholder="Seleccione período" />
                    </SelectTrigger>
                    <SelectContent className="bg-paper-deep border border-paper-muted">
                      <SelectItem value="daily" className="text-xs font-body hover:bg-paper">Diario</SelectItem>
                      <SelectItem value="monthly" className="text-xs font-body hover:bg-paper">Mensual</SelectItem>
                      <SelectItem value="yearly" className="text-xs font-body hover:bg-paper">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="font-body text-xs text-ink-soft">Desde</Label>
                  <Input
                    type="date"
                    value={reportFrom.split("T", 1)[0]}
                    onChange={(e) => setReportFrom(`${e.target.value}T00:00:00Z`)}
                    className="bg-paper-deep border-paper-muted rounded-lg text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="font-body text-xs text-ink-soft">Hasta</Label>
                  <Input
                    type="date"
                    value={reportTo.split("T", 1)[0]}
                    onChange={(e) => setReportTo(`${e.target.value}T23:59:59Z`)}
                    className="bg-paper-deep border-paper-muted rounded-lg text-xs font-mono"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleGenerateReport}
                    disabled={loadingReport}
                    className="w-full bg-coral hover:bg-coral/95 text-white font-body text-sm rounded-lg shadow-sm"
                  >
                    {loadingReport ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Generar Reporte"}
                  </Button>
                </div>
              </div>

              {/* Report Results */}
              {loadingReport ? (
                <div className="flex flex-col justify-center items-center py-20 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-coral" />
                  <p className="font-body text-xs text-ink-soft">Calculando ingresos...</p>
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-16 text-ink-soft/60 font-body text-sm italic">
                  Complete los filtros arriba y pulse "Generar Reporte" para ver estadísticas.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-6">
                  {/* Visual Graph using pure CSS grids */}
                  <div className="bg-paper/20 border border-paper-muted rounded-2xl p-6 flex flex-col justify-between min-h-[300px]">
                    <h3 className="font-heading text-base font-semibold text-ink mb-4">Ingresos Agrupados</h3>
                    <div className="flex items-end justify-around h-48 border-b border-paper-muted pb-2">
                      {reports.map((item, idx) => {
                        const maxVal = Math.max(...reports.map(r => r.totalRevenue), 1);
                        const percent = (item.totalRevenue / maxVal) * 100;
                        return (
                          <div key={idx} className="flex flex-col items-center gap-2 w-full max-w-[50px] group">
                            <div className="text-[10px] font-mono text-coral font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                              ${item.totalRevenue.toFixed(0)}
                            </div>
                            <div
                              style={{ height: `${Math.max(percent, 4)}%` }}
                              className="w-8 bg-coral/80 rounded-t-lg transition-all duration-500 hover:bg-coral group-hover:scale-x-105"
                            />
                            <div className="text-[10px] font-mono text-ink-soft rotate-[-20deg] origin-top-left mt-1">
                              {item.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="font-body text-xs text-ink-soft mt-6 italic">
                      * Gráfico interactivo: Pasa el cursor por encima de las barras para ver el valor de ingresos exacto.
                    </div>
                  </div>

                  {/* Summary Table */}
                  <div className="border border-paper-muted rounded-2xl overflow-hidden">
                    <Table>
                      <TableHeader className="bg-paper/40">
                        <TableRow className="border-paper-muted">
                          <TableHead className="font-body text-xs text-ink-soft py-3 pl-4">Período</TableHead>
                          <TableHead className="font-body text-xs text-ink-soft text-right">Cant. Facturas</TableHead>
                          <TableHead className="font-body text-xs text-ink-soft text-right pr-4">Total Recaudado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reports.map((item, idx) => (
                          <TableRow key={idx} className="border-paper-muted">
                            <TableCell className="font-mono text-xs text-ink py-3 pl-4">{item.label}</TableCell>
                            <TableCell className="font-mono text-xs text-ink text-right">{item.invoiceCount}</TableCell>
                            <TableCell className="font-mono text-xs text-ink text-right font-bold pr-4">
                              ${item.totalRevenue.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Member lookup */}
        <TabsContent value="member" className="space-y-4">
          <Card className="bg-paper-deep border-paper-muted rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-xl">Historial del Miembro</CardTitle>
              <CardDescription className="font-body text-xs text-ink-soft">Consulte la facturación histórica de un usuario específico.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentUser?.role === "admin" ? (
                <div className="flex gap-3 max-w-md items-end mb-4">
                  <div className="flex-1 space-y-1.5">
                    <Label className="font-body text-xs text-ink-soft">Seleccionar Miembro</Label>
                    <Select
                      value={searchMemberId}
                      onValueChange={(val) => {
                        setSearchMemberId(val);
                        setLoadingMember(true);
                        billingService.getMemberHistory(val, 0, 100)
                          .then((res) => {
                            setMemberInvoices((res as any).invoices ?? res.content ?? []);
                            setMemberSearched(true);
                          })
                          .catch(() => {
                            toast.error("Error al cargar historial del miembro");
                          })
                          .finally(() => {
                            setLoadingMember(false);
                          });
                      }}
                    >
                      <SelectTrigger className="bg-paper-deep border-paper-muted rounded-xl text-xs font-body h-10">
                        <SelectValue placeholder="Seleccione un miembro" />
                      </SelectTrigger>
                      <SelectContent className="bg-paper-deep border border-paper-muted">
                        {usersList.map((usr) => (
                          <SelectItem key={usr.id} value={usr.id} className="text-xs font-body hover:bg-paper">
                            {usr.full_name || "Sin Nombre"} ({usr.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSearchMember} className="flex gap-3 max-w-md">
                  <div className="flex-1">
                    <Input
                      placeholder="Mi ID de Miembro"
                      value={searchMemberId}
                      className="bg-paper border-paper-muted rounded-xl text-xs font-mono h-10"
                      disabled
                      readOnly
                    />
                  </div>
                  <Button type="submit" className="bg-ink hover:bg-ink/90 text-white font-body text-xs rounded-xl px-4 h-10">
                    <Search className="w-4 h-4 mr-2" /> Buscar
                  </Button>
                </form>
              )}

              {loadingMember ? (
                <div className="flex flex-col justify-center items-center py-20 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-coral" />
                  <p className="font-body text-xs text-ink-soft">Buscando historial...</p>
                </div>
              ) : memberSearched && memberInvoices.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-paper-muted rounded-2xl">
                  <p className="font-body text-sm text-ink-soft">No se encontraron facturas asociadas a este miembro.</p>
                </div>
              ) : memberInvoices.length > 0 ? (
                <div className="border border-paper-muted rounded-2xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-paper/40">
                      <TableRow className="border-paper-muted">
                        <TableHead className="font-body text-xs text-ink-soft py-3 pl-4">Descripción</TableHead>
                        <TableHead className="font-body text-xs text-ink-soft text-right">Monto</TableHead>
                        <TableHead className="font-body text-xs text-ink-soft">Vencimiento</TableHead>
                        <TableHead className="font-body text-xs text-ink-soft">Estado</TableHead>
                        <TableHead className="font-body text-xs text-ink-soft text-right pr-4">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {memberInvoices.map((inv) => (
                        <TableRow key={inv.id} className="border-paper-muted">
                          <TableCell className="font-body text-xs text-ink py-3 pl-4">{inv.description}</TableCell>
                          <TableCell className="font-mono text-xs text-ink text-right font-semibold">
                            ${inv.amount.toFixed(2)}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-ink-soft">
                            {new Date(inv.dueDate).toLocaleDateString("es-ES")}
                          </TableCell>
                          <TableCell>{getStatusBadge(inv.status)}</TableCell>
                          <TableCell className="text-right pr-4">
                            {inv.status === "PENDING" && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  void handlePayInvoice(inv.id);
                                  // Re-trigger search to update state
                                  setTimeout(() => {
                                    void billingService.getMemberHistory(searchMemberId, 0, 100).then(res => setMemberInvoices((res as any).invoices ?? res.content ?? []));
                                  }, 500);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-body text-xs rounded-lg"
                              >
                                Pagar
                              </Button>
                            )}
                            {inv.status !== "PENDING" && <span className="font-body text-xs text-ink-faint">-</span>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-paper-deep border border-paper-muted rounded-3xl shadow-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-ink">Emitir Factura</DialogTitle>
            <DialogDescription className="font-body text-xs text-ink-soft">
              Genera un nuevo cargo en el sistema para un miembro.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateInvoice} className="space-y-4">
            {currentUser?.role === "admin" ? (
              <div className="space-y-1.5">
                <Label className="font-body text-xs text-ink-soft">Seleccionar Miembro</Label>
                {loadingUsers ? (
                  <div className="flex items-center gap-2 text-xs text-ink-soft h-10">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando miembros...
                  </div>
                ) : (
                  <Select value={newMemberId} onValueChange={setNewMemberId}>
                    <SelectTrigger className="bg-paper-deep border-paper-muted rounded-xl text-xs font-body h-10">
                      <SelectValue placeholder="Seleccione un miembro" />
                    </SelectTrigger>
                    <SelectContent className="bg-paper-deep border border-paper-muted">
                      {usersList.map((usr) => (
                        <SelectItem key={usr.id} value={usr.id} className="text-xs font-body hover:bg-paper">
                          {usr.full_name || "Sin Nombre"} ({usr.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="font-body text-xs text-ink-soft">Mi ID de Miembro</Label>
                <Input
                  value={newMemberId}
                  className="bg-paper border-paper-muted rounded-xl text-xs font-mono h-10"
                  disabled
                  readOnly
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="font-body text-xs text-ink-soft">Monto ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="150.00"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="bg-paper-deep border-paper-muted rounded-xl text-xs font-mono h-10"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="font-body text-xs text-ink-soft">Vencimiento</Label>
                <Input
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="bg-paper-deep border-paper-muted rounded-xl text-xs font-mono h-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="font-body text-xs text-ink-soft">Descripción</Label>
              <Input
                placeholder="Ej. Reserva Sala A - Junio 2026"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="bg-paper-deep border-paper-muted rounded-xl text-xs font-body h-10"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                className="border-paper-muted hover:bg-paper font-body text-xs rounded-xl h-10"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="bg-coral hover:bg-coral/95 text-white font-body text-xs rounded-xl h-10 shadow-sm"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear Factura"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoicesView;
