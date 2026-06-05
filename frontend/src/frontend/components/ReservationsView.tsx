import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { checkingService, type Reservation } from "../services/checking";
import { Loader2, Plus, Calendar, CheckCircle2, XCircle, AlertCircle, Bookmark } from "lucide-react";

// Predefined spaces that match the seeded records in database
const SPACES = [
  { id: "a0a0a0a0-0000-0000-0000-000000000001", name: "Escritorio Flex 1", type: "Escritorio" },
  { id: "a0a0a0a0-0000-0000-0000-000000000002", name: "Sala de Reuniones Premium", type: "Sala" },
  { id: "a0a0a0a0-0000-0000-0000-000000000003", name: "Oficina Privada Ejecutiva", type: "Oficina" },
];

const ReservationsView = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  // Form Booking State
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("17:00");
  const [notes, setNotes] = useState("");
  const [booking, setBooking] = useState(false);

  // Cancellation State
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReservationId, setCancelReservationId] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const data = await checkingService.getReservations();
      setReservations(data);
    } catch (error) {
      toast.error("Error al cargar las reservas");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchReservations();
  }, []);

  const handleBookReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpaceId || !startDate || !startTime || !endDate || !endTime) {
      toast.error("Por favor complete los campos obligatorios");
      return;
    }

    setBooking(true);
    try {
      const startDateTime = new Date(`${startDate}T${startTime}:00Z`).toISOString();
      const endDateTime = new Date(`${endDate}T${endTime}:00Z`).toISOString();

      if (new Date(startDateTime) >= new Date(endDateTime)) {
        toast.error("La fecha de inicio debe ser anterior a la de fin");
        setBooking(false);
        return;
      }

      await checkingService.createReservation({
        space_id: selectedSpaceId,
        start: startDateTime,
        end: endDateTime,
        notes: notes.trim() ? notes : undefined,
      });

      toast.success("Reserva creada con éxito en estado pendiente");
      setBookingOpen(false);
      // Reset form
      setSelectedSpaceId("");
      setStartDate("");
      setEndDate("");
      setNotes("");
      void fetchReservations();
    } catch (error) {
      // Extract sqlx error or display clean message
      const msg = error instanceof Error ? error.message : "Error al registrar la reserva";
      if (msg.includes("Overlapping") || msg.toLowerCase().includes("overlap")) {
        toast.error("Error de conflicto: El espacio ya está reservado en ese rango de tiempo");
      } else {
        toast.error(msg);
      }
    } finally {
      setBooking(false);
    }
  };

  const handleConfirmReservation = async (id: string) => {
    try {
      await checkingService.confirmReservation(id);
      toast.success("Reserva confirmada correctamente");
      void fetchReservations();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al confirmar la reserva");
    }
  };

  const handleOpenCancelDialog = (id: string) => {
    setCancelReservationId(id);
    setCancelReason("");
    setCancelOpen(true);
  };

  const handleCancelReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReservationId) return;

    setCancelling(true);
    try {
      await checkingService.cancelReservation(cancelReservationId, cancelReason.trim() ? cancelReason : undefined);
      toast.success("Reserva cancelada con éxito");
      setCancelOpen(false);
      void fetchReservations();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cancelar la reserva");
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status: Reservation["status"]) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-mono"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> CONFIRMADA</Badge>;
      case "cancelled":
        return <Badge className="bg-rose/10 text-rose border border-rose/20 font-mono"><XCircle className="w-3.5 h-3.5 mr-1" /> CANCELADA</Badge>;
      case "completed":
        return <Badge className="bg-blue-500/10 text-blue-600 border border-blue-500/20 font-mono"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> COMPLETADA</Badge>;
      case "no_show":
        return <Badge className="bg-zinc-500/10 text-zinc-600 border border-zinc-500/20 font-mono"><AlertCircle className="w-3.5 h-3.5 mr-1" /> NO ASISTIÓ</Badge>;
      case "pending":
      default:
        return <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20 font-mono"><Bookmark className="w-3.5 h-3.5 mr-1" /> PENDIENTE</Badge>;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-paper-deep border border-paper-muted rounded-3xl p-6 md:p-8 shadow-sm">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-ink-soft bg-paper px-3 py-1 rounded-full">🦀 Checking Service</span>
          <h1 className="font-heading text-4xl text-ink font-semibold tracking-tight mt-3">Gestión de Reservas</h1>
          <p className="font-body text-ink-soft text-sm mt-2 max-w-xl">
            Reserva escritorios, salas de reuniones u oficinas. Visualiza el estado de tus check-ins y agenda slots sin solapamientos.
          </p>
        </div>
        <Button
          onClick={() => setBookingOpen(true)}
          className="w-full md:w-auto bg-coral hover:bg-coral/95 text-white font-body text-sm rounded-xl shadow-md transition-all hover:scale-[1.02] py-6 px-6"
        >
          <Plus className="w-4 h-4 mr-2" /> Reservar Espacio
        </Button>
      </div>

      {/* Main Reservation Card List */}
      <Card className="bg-paper-deep border-paper-muted rounded-3xl shadow-sm overflow-hidden">
        <CardHeader className="border-b border-paper-muted pb-4">
          <CardTitle className="font-heading text-xl">Mis Agendamientos</CardTitle>
          <CardDescription className="font-body text-xs text-ink-soft">
            Muestra el historial y estado de reservas asociadas a tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-coral" />
              <p className="font-body text-xs text-ink-soft">Cargando reservas...</p>
            </div>
          ) : reservations.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <Calendar className="w-12 h-12 mx-auto text-ink-faint" />
              <p className="font-body text-sm text-ink-soft">Aún no has realizado ninguna reserva.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-paper/40">
                  <TableRow className="border-paper-muted">
                    <TableHead className="font-body text-xs text-ink-soft py-4 pl-6">Espacio</TableHead>
                    <TableHead className="font-body text-xs text-ink-soft">Fecha</TableHead>
                    <TableHead className="font-body text-xs text-ink-soft">Horario (UTC)</TableHead>
                    <TableHead className="font-body text-xs text-ink-soft">Notas</TableHead>
                    <TableHead className="font-body text-xs text-ink-soft">Estado</TableHead>
                    <TableHead className="font-body text-xs text-ink-soft text-right pr-6">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.map((res) => {
                    const spaceName = SPACES.find(s => s.id === res.space_id)?.name || "Espacio Compartido";
                    const startDT = new Date(res.start);
                    const endDT = new Date(res.end);
                    return (
                      <TableRow key={res.id} className="border-paper-muted hover:bg-paper/20 transition-colors">
                        <TableCell className="font-body text-xs text-ink py-4 pl-6 font-semibold">
                          {spaceName}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-ink-soft">
                          {startDT.toLocaleDateString("es-ES")}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-ink-soft">
                          {startDT.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })} - {endDT.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                        </TableCell>
                        <TableCell className="font-body text-xs text-ink-soft max-w-[200px] truncate" title={res.notes || ""}>
                          {res.notes || <span className="text-ink-faint italic">Ninguna</span>}
                        </TableCell>
                        <TableCell>{getStatusBadge(res.status)}</TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-2">
                            {res.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleConfirmReservation(res.id)}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-body text-xs rounded-lg shadow-sm"
                                >
                                  Confirmar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenCancelDialog(res.id)}
                                  className="border-paper-muted hover:bg-paper text-rose hover:text-rose font-body text-xs rounded-lg"
                                >
                                  Cancelar
                                </Button>
                              </>
                            )}
                            {res.status === "confirmed" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenCancelDialog(res.id)}
                                className="border-paper-muted hover:bg-paper text-rose hover:text-rose font-body text-xs rounded-lg"
                              >
                                Cancelar
                              </Button>
                            )}
                            {res.status === "cancelled" && res.cancellation_reason && (
                              <span className="font-body text-xs text-ink-faint italic truncate max-w-[150px]" title={res.cancellation_reason}>
                                Motivo: {res.cancellation_reason}
                              </span>
                            )}
                            {res.status !== "pending" && res.status !== "confirmed" && !res.cancellation_reason && (
                              <span className="font-body text-xs text-ink-faint">-</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Book Space Modal */}
      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="bg-paper-deep border border-paper-muted rounded-3xl shadow-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-ink">Agendar Espacio</DialogTitle>
            <DialogDescription className="font-body text-xs text-ink-soft">
              Verifique los horarios antes de reservar. El sistema validará colisiones temporalmente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleBookReservation} className="space-y-4">
            <div className="space-y-1">
              <Label className="font-body text-xs text-ink-soft">Espacio a Reservar</Label>
              <Select value={selectedSpaceId} onValueChange={setSelectedSpaceId}>
                <SelectTrigger className="bg-paper-deep border-paper-muted rounded-xl text-xs font-body h-10">
                  <SelectValue placeholder="Seleccione un espacio" />
                </SelectTrigger>
                <SelectContent className="bg-paper-deep border border-paper-muted">
                  {SPACES.map((space) => (
                    <SelectItem key={space.id} value={space.id} className="text-xs font-body hover:bg-paper">
                      {space.name} ({space.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Slot Selectors */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="font-body text-xs text-ink-soft">Fecha Entrada</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (!endDate) setEndDate(e.target.value);
                  }}
                  className="bg-paper-deep border-paper-muted rounded-xl text-xs font-mono h-10"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="font-body text-xs text-ink-soft">Hora Entrada</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="bg-paper-deep border-paper-muted rounded-xl text-xs font-mono h-10"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="font-body text-xs text-ink-soft">Fecha Salida</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-paper-deep border-paper-muted rounded-xl text-xs font-mono h-10"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="font-body text-xs text-ink-soft">Hora Salida</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="bg-paper-deep border-paper-muted rounded-xl text-xs font-mono h-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="font-body text-xs text-ink-soft">Notas Opcionales</Label>
              <Input
                placeholder="Ej. Proyector necesario, reunión con cliente"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-paper-deep border-paper-muted rounded-xl text-xs font-body h-10"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBookingOpen(false)}
                className="border-paper-muted hover:bg-paper font-body text-xs rounded-xl h-10"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={booking}
                className="bg-coral hover:bg-coral/95 text-white font-body text-xs rounded-xl h-10 shadow-sm"
              >
                {booking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Agendar Reserva"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel Reservation Modal */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="bg-paper-deep border border-paper-muted rounded-3xl shadow-xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-ink">Cancelar Reserva</DialogTitle>
            <DialogDescription className="font-body text-xs text-ink-soft">
              ¿Está seguro de que desea cancelar esta reserva? Esta acción liberará el espacio inmediatamente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCancelReservation} className="space-y-4">
            <div className="space-y-1">
              <Label className="font-body text-xs text-ink-soft">Motivo de cancelación (opcional)</Label>
              <Input
                placeholder="Ej. Cambio de planes, enfermedad"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="bg-paper-deep border-paper-muted rounded-xl text-xs font-body h-10"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCancelOpen(false)}
                className="border-paper-muted hover:bg-paper font-body text-xs rounded-xl h-10"
              >
                Cerrar
              </Button>
              <Button
                type="submit"
                disabled={cancelling}
                className="bg-rose hover:bg-rose/95 text-white font-body text-xs rounded-xl h-10 shadow-sm"
              >
                {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Cancelación"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReservationsView;
