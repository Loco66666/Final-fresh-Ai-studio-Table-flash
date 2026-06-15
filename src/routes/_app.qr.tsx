import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AppHeader } from "@/components/AppHeader";
import { useMyRestaurant } from "@/hooks/useMyRestaurant";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  QrCode,
  TrendingUp,
  Receipt,
  Plus,
  Link as LinkIcon,
  MoreHorizontal,
  Power,
  Printer,
  X,
  Loader2,
  Trash2,
  Edit2,
  Check,
  CheckSquare,
  Square,
  Search,
  ChevronUp,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_app/qr")({ component: QrPage });

type TableZone = "Salle" | "Terrasse" | "A emporter";

type TableRow = {
  id: string;
  label: string;
  zone: TableZone;
  active: boolean;
};

type ActiveZoneFilter = "Toutes" | TableZone;

function QrPage() {
  const { data: me } = useMyRestaurant();
  const restaurantId = me?.restaurant?.id;
  const restaurantName = me?.restaurant?.name ?? "Mon restaurant";
  const serviceLabel = me?.restaurant?.welcome_fr ? "En ligne" : "Service";

  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrOrdersCount, setQrOrdersCount] = useState(0);

  // Sheets and actions states
  const [showQr, setShowQr] = useState<TableRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<TableRow | null>(null);

  // Form value states
  const [label, setLabel] = useState("");
  const [zone, setZone] = useState<"Salle" | "Terrasse" | "A emporter">("Salle");
  const [saving, setSaving] = useState(false);

  // Advanced features: filter & bulk mode states
  const [activeZone, setActiveZone] = useState<ActiveZoneFilter>("Toutes");
  const [modalMode, setModalMode] = useState<"single" | "bulk">("single");
  const [bulkPrefix, setBulkPrefix] = useState("Table");
  const [bulkStart, setBulkStart] = useState(1);
  const [bulkEnd, setBulkEnd] = useState(10);

  // Multi-selection & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const selectAllVisible = () => {
    setSelected(new Set(sortedAndFilteredTables.map((t) => t.id)));
  };

  const bulkToggleActive = async (nextActive: boolean) => {
    if (selected.size === 0) return;
    setBulkUpdating(true);
    try {
      const ids = Array.from(selected);
      const { error } = await supabase.from("tables").update({ active: nextActive }).in("id", ids);

      if (error) throw error;
      toast.success(`${ids.length} table(s) ${nextActive ? "activée(s)" : "désactivée(s)"}`);
      exitSelectMode();
      void loadData();
    } catch (err) {
      console.error(err);
      toast.error("Échec de la modification en masse");
    } finally {
      setBulkUpdating(false);
    }
  };

  const bulkDeleteTables = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Supprimer ces ${selected.size} tables ?`)) return;
    setBulkUpdating(true);
    try {
      const ids = Array.from(selected);
      const { error } = await supabase.from("tables").delete().in("id", ids);

      if (error) throw error;
      toast.success(`${ids.length} table(s) supprimée(s)`);
      exitSelectMode();
      void loadData();
    } catch (err) {
      console.error(err);
      toast.error("Échec de la suppression en masse");
    } finally {
      setBulkUpdating(false);
    }
  };

  const bulkPrintTables = () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected).join(",");
    window.open(`/qr/print?ids=${ids}`, "_blank");
  };

  const loadData = useCallback(async () => {
    if (!restaurantId) return;
    try {
      // 1) Load tables
      const { data: dbTables, error: tablesErr } = await supabase
        .from("tables")
        .select("id, label, zone, active")
        .eq("restaurant_id", restaurantId)
        .order("label");

      if (tablesErr) throw tablesErr;
      setTables((dbTables ?? []) as TableRow[]);

      // 2) Load QR orders count safely using SELECT length to bypass count query issues on mock DB
      const { data: dbOrders, error: ordersErr } = await supabase
        .from("orders")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .not("table_id", "is", null);

      if (!ordersErr && dbOrders) {
        setQrOrdersCount(dbOrders.length);
      } else {
        setQrOrdersCount(0);
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur de chargement des données");
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) {
      void loadData();
    }
  }, [restaurantId, loadData]);

  const activeQrCount = useMemo(() => tables.filter((t) => t.active).length, [tables]);
  const estimatedScans = useMemo(() => {
    // Elegant estimate of traffic based on order volume and number of tables, robustly protected against NaN
    const ordersVal = Number(qrOrdersCount) || 0;
    const qrsVal = Number(activeQrCount) || 0;
    return Math.max(0, ordersVal * 3) + qrsVal * 2;
  }, [qrOrdersCount, activeQrCount]);

  const sortedAndFilteredTables = useMemo(() => {
    let result = [...tables];
    if (activeZone !== "Toutes") {
      result = result.filter((t) => t.zone === activeZone);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((t) => t.label.toLowerCase().includes(q));
    }
    // Natural alphanumeric sorting for table labels (e.g., Table 2 before Table 10)
    return result.sort((a, b) =>
      a.label.localeCompare(b.label, undefined, {
        numeric: true,
        sensitivity: "base",
      }),
    );
  }, [tables, activeZone, searchQuery]);

  const tableUrl = (id: string) => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://tableflash.app";
    return `${origin}/t/${id}`;
  };

  const copyLink = (t: TableRow) => {
    const url = tableUrl(t.id);
    navigator.clipboard?.writeText(url);
    toast.success(`Lien de la ${t.label} copié !`);
  };

  const toggleActive = async (t: TableRow) => {
    const nextState = !t.active;
    // Optimistic update
    setTables((prev) => prev.map((x) => (x.id === t.id ? { ...x, active: nextState } : x)));

    const { error } = await supabase.from("tables").update({ active: nextState }).eq("id", t.id);

    if (error) {
      toast.error("Impossible de modifier le statut de la table");
      void loadData();
    } else {
      toast.success(`${t.label} ${nextState ? "activée" : "désactivée"}`);
    }
  };

  const openAddForm = () => {
    setEditingTable(null);
    setLabel("");
    setZone("Salle");
    setModalMode("single");
    setBulkPrefix("Table");
    setBulkStart(1);
    setBulkEnd(10);
    setFormOpen(true);
  };

  const openEditForm = (t: TableRow) => {
    setEditingTable(t);
    setLabel(t.label);
    setZone(t.zone);
    setModalMode("single");
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;

    setSaving(true);
    try {
      if (editingTable) {
        if (!label.trim()) return;
        // Update existing table
        const { error } = await supabase
          .from("tables")
          .update({
            label: label.trim(),
            zone,
          })
          .eq("id", editingTable.id);

        if (error) throw error;
        toast.success("Table mise à jour");
      } else if (modalMode === "bulk") {
        if (!bulkPrefix.trim()) return;
        const start = Math.min(bulkStart, bulkEnd);
        const end = Math.max(bulkStart, bulkEnd);

        if (end - start > 100) {
          toast.error("Veuillez générer au maximum 100 tables à la fois");
          setSaving(false);
          return;
        }

        const rowsToInsert = [];
        for (let i = start; i <= end; i++) {
          rowsToInsert.push({
            restaurant_id: restaurantId,
            label: `${bulkPrefix.trim()} ${i}`.trim(),
            zone,
            active: true,
          });
        }

        const { error } = await supabase.from("tables").insert(rowsToInsert);
        if (error) throw error;
        toast.success(`${rowsToInsert.length} tables créées avec succès !`);
      } else {
        if (!label.trim()) return;
        // Insert new table
        const { error } = await supabase.from("tables").insert({
          restaurant_id: restaurantId,
          label: label.trim(),
          zone,
          active: true,
        });

        if (error) throw error;
        toast.success("Table créée");
      }
      setFormOpen(false);
      void loadData();
    } catch (err) {
      console.error(err);
      toast.error("Échec de l'enregistrement des données");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("tables").delete().eq("id", deleteConfirm.id);
      if (error) throw error;
      toast.success(`${deleteConfirm.label} supprimée`);
      setDeleteConfirm(null);
      void loadData();
    } catch (err) {
      console.error(err);
      toast.error("Impossible de supprimer cette table (actifs associés ou erreur)");
    } finally {
      setSaving(false);
    }
  };

  const isFormDisabled =
    saving || (editingTable || modalMode === "single" ? !label.trim() : !bulkPrefix.trim());

  const handleHudToggle = () => {
    if (selected.size === sortedAndFilteredTables.length) {
      exitSelectMode();
    } else {
      selectAllVisible();
    }
  };

  return (
    <div>
      <AppHeader title={restaurantName} subtitle={serviceLabel} />
      <h2 className="px-5 mt-1 font-display font-extrabold text-foreground text-[26px]">
        QR par table
      </h2>

      {/* Metrics Section */}
      <div className="mx-5 mt-3 rounded-2xl bg-primary-soft/60 p-4 grid grid-cols-3 gap-2 text-center">
        <Stat icon={<QrCode className="size-5" />} value={activeQrCount} label="QR actifs" />
        <Stat icon={<TrendingUp className="size-5" />} value={estimatedScans} label="scans" />
        <Stat icon={<Receipt className="size-5" />} value={qrOrdersCount} label="commandes QR" />
      </div>

      {/* Zone Filters (Emojis completely removed) */}
      <div className="px-5 mt-4 flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {(["Toutes", "Salle", "Terrasse", "A emporter"] as const).map((z) => (
          <button
            key={z}
            onClick={() => {
              setActiveZone(z);
              if (selectMode) setSelected(new Set());
            }}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
              activeZone === z
                ? "bg-primary border-primary text-primary-foreground shadow-sm"
                : "bg-card border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {z === "Toutes" && "Toutes"}
            {z === "Salle" && "Salle"}
            {z === "Terrasse" && "Terrasse"}
            {z === "A emporter" && "À emporter"}
          </button>
        ))}
      </div>

      {/* Search and Multi-select action bar */}
      <div className="px-5 mt-3 flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-xl bg-card border border-border px-3 py-2.5">
          <Search className="size-5 text-muted-foreground shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une table..."
            className="flex-1 bg-transparent outline-none text-[14px] text-foreground placeholder:text-muted-foreground/60"
          />
        </div>
        <button
          onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
          className={`shrink-0 rounded-xl border px-4 py-2.5 text-[13px] font-semibold transition-all ${
            selectMode
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card border-border text-foreground/80 hover:bg-muted"
          }`}
        >
          {selectMode ? "Annuler" : "Sélectionner"}
        </button>
      </div>

      {/* Add Table Button */}
      {!selectMode && (
        <div className="px-5 mt-3">
          <button
            onClick={openAddForm}
            className="w-full bg-primary text-primary-foreground rounded-2xl py-3.5 font-semibold flex items-center justify-center gap-2 hover:bg-opacity-95 active:scale-[0.99] transition-all"
          >
            <span className="size-7 rounded-full bg-primary-foreground text-primary grid place-items-center">
              <Plus className="size-4" strokeWidth={3} />
            </span>
            Ajouter une table
          </button>
        </div>
      )}

      {/* Table List / Cards */}
      <div className="px-5 mt-4 space-y-3 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground mt-2">Chargement des tables...</p>
          </div>
        ) : tables.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border px-3 py-8 text-center text-sm text-muted-foreground">
            Aucune table pour le moment. Ajoutez votre première table pour générer un QR code.
          </div>
        ) : sortedAndFilteredTables.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border px-3 py-8 text-center text-sm text-muted-foreground animate-fade-in">
            Aucune table trouvée.
          </div>
        ) : (
          sortedAndFilteredTables.map((t) => {
            const isSel = selected.has(t.id);
            return (
              <div
                key={t.id}
                onClick={selectMode ? () => toggleSelect(t.id) : undefined}
                className={`rounded-2xl bg-card border p-3.5 shadow-sm transition-all ${
                  selectMode ? "cursor-pointer" : ""
                } ${isSel ? "border-primary ring-2 ring-primary/30 bg-primary-soft/10" : "border-border"}`}
              >
                <div className="flex items-center gap-3">
                  {selectMode && (
                    <div className="shrink-0">
                      {isSel ? (
                        <CheckSquare className="size-5 text-primary" />
                      ) : (
                        <Square className="size-5 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <div className="size-11 rounded-full bg-primary-soft text-primary grid place-items-center font-bold">
                    {t.label.replace(/\D/g, "") || t.label.slice(0, 1)}
                  </div>
                  <div className="flex-1">
                    <div className="font-display font-bold text-foreground">{t.label}</div>
                    <div className="text-[12px] text-muted-foreground">
                      {t.zone === "A emporter" ? "À emporter" : t.zone}
                    </div>
                  </div>
                  {!selectMode && (
                    <>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleActive(t);
                        }}
                        className={`px-2.5 py-1 rounded-full text-[12px] cursor-pointer transition-colors ${
                          t.active
                            ? "bg-primary-soft text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <span className="inline-flex items-center gap-1">
                          <span
                            className={`size-1.5 rounded-full ${
                              t.active ? "bg-primary animate-pulse" : "bg-muted-foreground"
                            }`}
                          />
                          {t.active ? "QR actif" : "Désactivé"}
                        </span>
                      </span>

                      {/* Dropdown Action Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className="size-8 grid place-items-center text-muted-foreground hover:bg-muted rounded-full"
                          >
                            <MoreHorizontal className="size-5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-48 p-1 rounded-xl shadow-lg border border-border bg-card"
                        >
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditForm(t);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer hover:bg-muted"
                          >
                            <Edit2 className="size-4" /> Modifier la table
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleActive(t);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer hover:bg-muted"
                          >
                            <Power className="size-4" /> {t.active ? "Désactiver" : "Activer"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowQr(t);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer hover:bg-muted"
                          >
                            <QrCode className="size-4" /> Voir le QR Code
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              copyLink(t);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg cursor-pointer hover:bg-muted"
                          >
                            <LinkIcon className="size-4" /> Copier le lien
                          </DropdownMenuItem>
                          <hr className="border-border my-1" />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(t);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-destructive rounded-lg cursor-pointer hover:bg-destructive/10"
                          >
                            <Trash2 className="size-4" /> Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>

                {/* Instant Secondary actions buttons (Hidden in selectMode) */}
                {!selectMode && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyLink(t);
                      }}
                      className="border border-border rounded-xl py-2.5 text-primary text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-primary-soft/30 active:scale-[0.98] transition-all"
                    >
                      <LinkIcon className="size-4" /> Copier lien
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowQr(t);
                      }}
                      className="border border-border rounded-xl py-2.5 text-primary text-[14px] font-medium flex items-center justify-center gap-2 hover:bg-primary-soft/30 active:scale-[0.98] transition-all"
                    >
                      <QrCode className="size-4" /> Voir QR
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Prepare Print Link (Hidden in selectMode) */}
      {!selectMode && (
        <div className="px-5 pb-6">
          <Link
            to="/qr/print"
            className="w-full border border-primary text-primary rounded-2xl py-3 font-semibold flex items-center justify-center gap-2 hover:bg-primary-soft/20 transition-all text-center block"
          >
            <Printer className="size-5" /> Préparer impression
          </Link>
        </div>
      )}

      {/* HUD de sélection en masse */}
      {selectMode && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-foreground text-background rounded-2xl shadow-xl px-4 py-3 flex items-center justify-between w-[calc(100%-40px)] max-w-[400px] border border-border/10 animate-slide-up">
          <div className="flex-1 min-w-0 pr-2">
            <div className="text-[13px] font-bold text-background/90 leading-tight truncate">
              {selected.size} sélectionnée{selected.size > 1 ? "s" : ""}
            </div>
            <button
              onClick={handleHudToggle}
              className="text-[11px] text-primary hover:underline block text-left font-semibold mt-0.5"
            >
              {selected.size === sortedAndFilteredTables.length
                ? "Désélectionner tout"
                : "Sélectionner tout filtré"}
            </button>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  disabled={selected.size === 0 || bulkUpdating}
                  className="flex items-center gap-1.5 text-[13px] font-bold rounded-xl px-3.5 py-2 bg-background text-foreground hover:bg-muted disabled:opacity-55 transition-all outline-none"
                >
                  Actions
                  <ChevronUp className="size-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side="top"
                sideOffset={8}
                className="w-56 p-1.5 rounded-xl shadow-xl border border-border bg-card text-foreground z-50"
              >
                <DropdownMenuItem
                  onClick={() => bulkToggleActive(true)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg cursor-pointer hover:bg-muted font-medium text-emerald-600 focus:text-emerald-700"
                >
                  <Power className="size-4 text-emerald-600" />
                  Activer la sélection
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => bulkToggleActive(false)}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg cursor-pointer hover:bg-muted font-medium text-amber-600 focus:text-amber-700"
                >
                  <Power className="size-4 text-amber-600" />
                  Désactiver la sélection
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={bulkPrintTables}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg cursor-pointer hover:bg-muted font-medium"
                >
                  <Printer className="size-4" />
                  Imprimer les QR codes
                </DropdownMenuItem>
                <hr className="border-border my-1" />
                <DropdownMenuItem
                  onClick={bulkDeleteTables}
                  className="flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg cursor-pointer text-destructive focus:text-destructive hover:bg-destructive/10 font-semibold"
                >
                  <Trash2 className="size-4" />
                  Supprimer la sélection
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              onClick={exitSelectMode}
              className="size-9 grid place-items-center rounded-xl hover:bg-background/15 text-background/85 transition-colors"
              aria-label="Quitter la sélection"
              title="Quitter"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}

      {/* QR Viewer Modal */}
      {showQr && (
        <div
          className="fixed inset-0 bg-foreground/40 grid place-items-center z-50 px-6 animate-fade-in"
          onClick={() => setShowQr(null)}
        >
          <div
            className="bg-card rounded-3xl p-6 w-full max-w-sm border border-border shadow-2xl animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-display font-bold text-lg">{showQr.label}</div>
                <div className="text-xs text-muted-foreground">{showQr.zone}</div>
              </div>
              <button
                onClick={() => setShowQr(null)}
                className="size-9 rounded-full grid place-items-center hover:bg-muted"
                aria-label="Fermer"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="aspect-square bg-primary-soft rounded-2xl grid place-items-center p-6">
              <QRCodeSVG
                value={tableUrl(showQr.id)}
                level="H"
                bgColor="transparent"
                fgColor="#0E7C3A"
                className="w-full h-full"
              />
            </div>
            <p className="text-center text-xs text-muted-foreground mt-4 break-all opacity-85 px-2">
              {tableUrl(showQr.id)}
            </p>
          </div>
        </div>
      )}

      {/* SlideSheet Form for Add/Edit Table */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 animate-fade-in"
          onClick={() => setFormOpen(false)}
        >
          <div
            className="w-full max-w-[440px] max-h-[92vh] overflow-y-auto rounded-t-3xl bg-background shadow-2xl border-t border-border animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-5 pb-3 bg-background border-b border-border">
              <div>
                <h2 className="font-display font-bold text-[18px]">
                  {editingTable ? "Modifier la table" : "Ajouter une table"}
                </h2>
                <p className="text-[12px] text-muted-foreground">
                  Gérez les identifiants de table pour vos QR codes clients.
                </p>
              </div>
              <button
                onClick={() => setFormOpen(false)}
                className="size-9 rounded-full grid place-items-center hover:bg-muted"
                aria-label="Fermer"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="px-5 py-4 space-y-5 pb-8">
              {/* Modal Mode Selector inside slide panel */}
              {!editingTable && (
                <div className="grid grid-cols-2 p-1 bg-muted rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setModalMode("single")}
                    className={`py-2 rounded-lg transition-all ${
                      modalMode === "single"
                        ? "bg-card text-foreground shadow-sm font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Table unique
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalMode("bulk")}
                    className={`py-2 rounded-lg transition-all ${
                      modalMode === "bulk"
                        ? "bg-card text-foreground shadow-sm font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Génération en masse
                  </button>
                </div>
              )}

              {/* Conditional rendering for Name vs Bulk creation fields */}
              {modalMode === "single" || editingTable ? (
                /* Table Name */
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-foreground">
                    Nom ou Numéro de table <span className="text-destructive">*</span>
                  </label>
                  <input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Ex : Table 14, Terrasse 3, Bar 1..."
                    className="w-full text-sm border border-border bg-card rounded-xl px-4 py-3 text-foreground outline-none focus:border-primary/50 transition-colors"
                    required
                  />
                </div>
              ) : (
                /* Bulk Settings fields */
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-semibold text-foreground">
                      Préfixe du nom <span className="text-destructive">*</span>
                    </label>
                    <input
                      value={bulkPrefix}
                      onChange={(e) => setBulkPrefix(e.target.value)}
                      placeholder="Ex : Table, Terrasse, Bar..."
                      className="w-full text-sm border border-border bg-card rounded-xl px-4 py-3 text-foreground outline-none focus:border-primary/50 transition-colors"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-semibold text-foreground">
                        Numéro de début <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={bulkStart}
                        onChange={(e) => setBulkStart(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full text-sm border border-border bg-card rounded-xl px-4 py-3 text-foreground outline-none focus:border-primary/50 transition-colors"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-semibold text-foreground">
                        Numéro de fin <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={bulkEnd}
                        onChange={(e) => setBulkEnd(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full text-sm border border-border bg-card rounded-xl px-4 py-3 text-foreground outline-none focus:border-primary/50 transition-colors"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Table Zone Selector */}
              <div className="space-y-1.5">
                <label className="text-[13px] font-semibold text-foreground">
                  Zone de service <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Salle", "Terrasse", "A emporter"] as const).map((z) => (
                    <button
                      type="button"
                      key={z}
                      onClick={() => setZone(z)}
                      className={`py-3 px-2 rounded-xl text-xs font-semibold border flex flex-col items-center justify-center gap-1 transition-all ${
                        zone === z
                          ? "bg-primary/10 border-primary text-primary font-bold"
                          : "bg-card border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <span>{z === "A emporter" ? "À emporter" : z}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="flex-1 border border-border rounded-xl py-3 font-semibold text-sm hover:bg-muted transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isFormDisabled}
                  className="flex-1 bg-primary text-primary-foreground font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-opacity-95 disabled:opacity-50 transition-colors"
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  {editingTable ? "Modifier" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5 animate-fade-in">
          <div className="w-full max-w-sm rounded-[24px] bg-card border border-border p-6 shadow-2xl animate-scale-up">
            <h3 className="font-display font-bold text-foreground text-[18px]">
              Supprimer la table ?
            </h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer la table{" "}
              <strong className="text-foreground">{deleteConfirm.label}</strong> (
              {deleteConfirm.zone}) ? Les anciens QR codes imprimés pour cette table cesseront
              instantanément de fonctionner pour vos clients.
            </p>
            <div className="mt-5 flex gap-2 justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={() => setDeleteConfirm(null)}
                className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleDelete}
                className="rounded-xl bg-destructive text-destructive-foreground px-4 py-2.5 text-sm font-semibold hover:bg-destructive/90 flex items-center gap-1.5"
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <div className="size-9 rounded-full bg-primary-soft text-primary grid place-items-center mb-1">
        {icon}
      </div>
      <div className="text-primary font-extrabold text-lg leading-none">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
