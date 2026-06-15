/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerFn } from "@tanstack/react-start";

// Initial seed data representing "Bistrot des Halles"
const INITIAL_SEED = {
  restaurants: [
    {
      id: "rest-123",
      name: "Bistrot des Halles",
      welcome_fr: "Bienvenue au Bistrot des Halles !",
      welcome_en: "Welcome to Bistrot des Halles!",
      welcome_es: "¡Bienvenido a Bistrot des Halles!",
      logo_url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4",
      google_review_url: "https://google.com",
    },
  ],
  user_roles: [
    {
      id: "role-1",
      user_id: "mock-user-123",
      restaurant_id: "rest-123",
      role: "owner",
      created_at: new Date().toISOString(),
    },
  ],
  menu_categories: [
    { id: "cat-1", restaurant_id: "rest-123", name: "Entrées", position: 1 },
    { id: "cat-2", restaurant_id: "rest-123", name: "Plats", position: 2 },
    { id: "cat-3", restaurant_id: "rest-123", name: "Desserts", position: 3 },
    { id: "cat-4", restaurant_id: "rest-123", name: "Boissons", position: 4 },
  ],
  products: [
    {
      id: "prod-1",
      restaurant_id: "rest-123",
      name: "Soupe à l'Oignon",
      description: "Soupe traditionnelle gratinée au gruyère et croûtons",
      price: 8.5,
      category: "Entrées",
      image_url: "https://images.unsplash.com/photo-1547592180-85f173990554",
      allergens: ["Lactose", "Gluten"],
      badges: ["Classique"],
      translations: { en: { name: "French Onion Soup" }, es: { name: "Sopa de Cebolla" } },
      position: 1,
      status: "disponible",
    },
    {
      id: "prod-2",
      restaurant_id: "rest-123",
      name: "Escargots de Bourgogne",
      description: "Les 6 escargots sauvages au beurre d'ail persillé",
      price: 10.0,
      category: "Entrées",
      image_url: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb",
      allergens: ["Lactose"],
      badges: [],
      translations: { en: { name: "Burgundy Snails" } },
      position: 2,
      status: "disponible",
    },
    {
      id: "prod-3",
      restaurant_id: "rest-123",
      name: "Entrecôte Frites",
      description:
        "Une délicieuse entrecôte charolaise grillée (300g), frites fraîches maison et sauce béarnaise",
      price: 24.5,
      category: "Plats",
      image_url: "https://images.unsplash.com/photo-1544025162-d76694265947",
      allergens: ["Lactose", "Sulfite"],
      badges: ["Populaire", "Chef"],
      translations: {
        en: { name: "Ribeye Steak with Fries" },
        es: { name: "Filete con Patatas Fritas" },
      },
      position: 1,
      status: "disponible",
    },
    {
      id: "prod-4",
      restaurant_id: "rest-123",
      name: "Cabillaud Rôti",
      description:
        "Pavé de cabillaud frais, purée fine de pommes de terre au beurre demi-sel et sauce vierge",
      price: 21.0,
      category: "Plats",
      image_url: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2",
      allergens: ["Poisson", "Lactose"],
      badges: [],
      translations: { en: { name: "Roasted Cod" } },
      position: 2,
      status: "disponible",
    },
    {
      id: "prod-5",
      restaurant_id: "rest-123",
      name: "Crème Brûlée",
      description: "Traditionnelle à la gousse de vanille bourbon de Madagascar",
      price: 7.5,
      category: "Desserts",
      image_url: "https://images.unsplash.com/photo-1516685018646-549198525c1b",
      allergens: ["Lactose", "Oeufs"],
      badges: ["Classique"],
      translations: { en: { name: "Vanilla Creme Brulee" } },
      position: 1,
      status: "disponible",
    },
    {
      id: "prod-6",
      restaurant_id: "rest-123",
      name: "Mousse au Chocolat",
      description: "Mousse maison au chocolat noir Valrhona 70%",
      price: 6.5,
      category: "Desserts",
      image_url: null,
      allergens: ["Oeufs", "Lactose"],
      badges: [],
      translations: { en: { name: "Chocolate Mousse" } },
      position: 2,
      status: "disponible",
    },
    {
      id: "prod-7",
      restaurant_id: "rest-123",
      name: "Côtes du Rhône",
      description: "Verre de vin rouge de la Vallée du Rhône (12cl)",
      price: 5.5,
      category: "Boissons",
      image_url: null,
      allergens: ["Sulfite"],
      badges: [],
      translations: { en: { name: "Rhone Valley Red Wine" } },
      position: 1,
      status: "disponible",
    },
    {
      id: "prod-8",
      restaurant_id: "rest-123",
      name: "Eau Fine Pétillante Badoit",
      description: "75cl bouteille en verre",
      price: 4.5,
      category: "Boissons",
      image_url: null,
      allergens: [],
      badges: [],
      translations: {},
      position: 2,
      status: "disponible",
    },
  ],
  tables: [
    {
      id: "e9fce8f4-6f97-4c07-b3fa-ecb29dbcfef1",
      restaurant_id: "rest-123",
      label: "Table 1",
      zone: "Salle",
      active: true,
    },
    {
      id: "e9fce8f4-6f97-4c07-b3fa-ecb29dbcfef2",
      restaurant_id: "rest-123",
      label: "Table 2",
      zone: "Terrasse",
      active: true,
    },
    {
      id: "e9fce8f4-6f97-4c07-b3fa-ecb29dbcfef3",
      restaurant_id: "rest-123",
      label: "Table 3",
      zone: "Salle",
      active: true,
    },
    {
      id: "e9fce8f4-6f97-4c07-b3fa-ecb29dbcfef4",
      restaurant_id: "rest-123",
      label: "Table 4",
      zone: "Salle",
      active: true,
    },
  ],
  orders: [
    {
      id: "ord-1",
      restaurant_id: "rest-123",
      table_id: "e9fce8f4-6f97-4c07-b3fa-ecb29dbcfef1",
      total: 33.0,
      status: "a_traiter",
      created_at: new Date().toISOString(),
      number: 101,
    },
    {
      id: "ord-2",
      restaurant_id: "rest-123",
      table_id: "e9fce8f4-6f97-4c07-b3fa-ecb29dbcfef2",
      total: 48.5,
      status: "en_preparation",
      created_at: new Date(Date.now() - 3600000).toISOString(),
      number: 102,
    },
  ],
  order_items: [
    {
      id: "oi-1",
      order_id: "ord-1",
      product_id: "prod-1",
      product_name: "Soupe à l'Oignon",
      qty: 2,
      unit_price: 8.5,
      created_at: new Date().toISOString(),
    },
    {
      id: "oi-2",
      order_id: "ord-1",
      product_id: "prod-7",
      product_name: "Côtes du Rhône",
      qty: 2,
      unit_price: 5.5,
      created_at: new Date().toISOString(),
    },
    {
      id: "oi-3",
      order_id: "ord-1",
      product_id: "prod-8",
      product_name: "Eau Fine Pétillante Badoit",
      qty: 1,
      unit_price: 4.5,
      created_at: new Date().toISOString(),
    },
    {
      id: "oi-4",
      order_id: "ord-2",
      product_id: "prod-3",
      product_name: "Entrecôte Frites",
      qty: 2,
      unit_price: 24.5,
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ],
  reviews: [
    {
      id: "rev-1",
      restaurant_id: "rest-123",
      table_id: "e9fce8f4-6f97-4c07-b3fa-ecb29dbcfef1",
      rating: 5,
      author: "Julien G.",
      comment: "Super rapide avec de superbes frites fraîches !",
      treated: false,
      created_at: new Date().toISOString(),
    },
  ],
  menus: [] as any[],
};

// Simple server-side in-memory cache to stay extremely fast
let cachedDb: any = null;

// Server-only data persistence helper
async function loadServerDb() {
  if (typeof window !== "undefined") return INITIAL_SEED;
  if (cachedDb) return cachedDb;

  const fs = await import("fs");
  const path = await import("path");
  const dbPath = "/tmp/tableflash_mock_db.json";

  try {
    if (fs.existsSync(dbPath)) {
      const parsed = JSON.parse(fs.readFileSync(dbPath, "utf-8"));
      // Ensure all tables are present in case file got corrupted
      cachedDb = { ...INITIAL_SEED, ...parsed };
      if (cachedDb.tables) {
        let changed = false;
        cachedDb.tables = cachedDb.tables.map((t: any) => {
          if (t.zone === "Mezzanine") {
            changed = true;
            return { ...t, zone: "Salle" };
          }
          return t;
        });
        if (changed) {
          fs.writeFileSync(dbPath, JSON.stringify(cachedDb, null, 2), "utf-8");
        }
      }
      return cachedDb;
    }
  } catch (err) {
    console.error("Error reading mock database:", err);
  }

  cachedDb = JSON.parse(JSON.stringify(INITIAL_SEED));
  try {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, JSON.stringify(cachedDb, null, 2), "utf-8");
  } catch (err) {
    console.error("Error creating mock database file:", err);
  }
  return cachedDb;
}

async function saveServerDb(db: any) {
  if (typeof window !== "undefined") return;
  cachedDb = db;
  try {
    const fs = await import("fs");
    const dbPath = "/tmp/tableflash_mock_db.json";
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving mock database:", err);
  }
}

// Server function that performs mock DB operations
export const runMockDbOp = createServerFn({ method: "POST" })
  .inputValidator((input: any) => input)
  .handler(async ({ data }) => {
    const db = await loadServerDb();
    const {
      table,
      op,
      filters,
      payload,
      orderByField,
      orderAscending,
      limitCount,
      singleRow,
      maybeSingleRow,
    } = data;

    if (!db[table]) {
      db[table] = [];
    }

    let rows = db[table] as any[];

    // Apply Filter Helpers
    if (filters && filters.length > 0) {
      rows = rows.filter((r) => {
        return (filters as any[]).every((f) => {
          const val = r[f.field];
          if (f.op === "eq") return val === f.value;
          if (f.op === "neq") return val !== f.value;
          if (f.op === "gte") return val >= f.value;
          if (f.op === "lte") return val <= f.value;
          if (f.op === "in") return Array.isArray(f.value) && f.value.includes(val);
          if (f.op === "not") {
            if (f.operator === "is") return val !== f.value;
            if (f.operator === "eq") return val !== f.value;
            if (f.operator === "in") return !f.value.includes(val);
            return val !== f.value;
          }
          return true;
        });
      });
    }

    if (op === "select") {
      let result = [...rows];
      let cols: Array<{ field: string; ascending: boolean }> = [];
      if (data.orderByCols && data.orderByCols.length > 0) {
        cols = data.orderByCols;
      } else if (orderByField) {
        cols = [{ field: orderByField, ascending: orderAscending }];
      }

      if (cols.length > 0) {
        result.sort((a, b) => {
          for (const col of cols) {
            const va = a[col.field];
            const vb = b[col.field];
            if (va !== undefined && vb !== undefined && va !== null && vb !== null) {
              if (va < vb) return col.ascending ? -1 : 1;
              if (va > vb) return col.ascending ? 1 : -1;
            }
          }
          return 0;
        });
      }
      if (limitCount !== null && limitCount !== undefined) {
        result = result.slice(0, limitCount);
      }
      if (singleRow) {
        const item = result[0];
        if (!item) return { data: null, error: { message: "Row not found" } };
        return { data: item, error: null };
      }
      if (maybeSingleRow) {
        const item = result[0] ?? null;
        return { data: item, error: null };
      }
      return { data: result, error: null };
    }

    if (op === "insert") {
      const itemsToInsert = Array.isArray(payload) ? payload : [payload];
      const inserted: any[] = [];
      const now = new Date().toISOString();

      for (const item of itemsToInsert) {
        const row = {
          id: item.id || crypto.randomUUID(),
          created_at: now,
          updated_at: now,
          ...item,
        };
        // Auto increments order number if inserting orders
        if (table === "orders" && !row.number) {
          const allOrders = db["orders"] as any[];
          row.number =
            allOrders.length > 0 ? Math.max(...allOrders.map((o) => o.number || 100)) + 1 : 101;
        }

        db[table].push(row);
        inserted.push(row);
      }

      await saveServerDb(db);
      return {
        data: Array.isArray(payload) ? inserted : inserted[0],
        error: null,
      };
    }

    if (op === "update") {
      const toUpdatePatch = payload || {};
      const updatedRows: any[] = [];
      const allRows = db[table] as any[];

      db[table] = allRows.map((r) => {
        // Evaluate if this row qualifies under filters
        const matches = ((filters as any[]) || []).every((f) => {
          const val = r[f.field];
          if (f.op === "eq") return val === f.value;
          if (f.op === "neq") return val !== f.value;
          if (f.op === "gte") return val >= f.value;
          if (f.op === "lte") return val <= f.value;
          if (f.op === "in") return Array.isArray(f.value) && f.value.includes(val);
          if (f.op === "not") {
            if (f.operator === "is") return val !== f.value;
            if (f.operator === "eq") return val !== f.value;
            if (f.operator === "in") return !f.value.includes(val);
            return val !== f.value;
          }
          return true;
        });

        if (matches) {
          const updated = { ...r, ...toUpdatePatch, updated_at: new Date().toISOString() };
          updatedRows.push(updated);
          return updated;
        }
        return r;
      });

      await saveServerDb(db);
      return {
        data: updatedRows,
        error: null,
      };
    }

    if (op === "delete") {
      const deletedRows: any[] = [];
      const allRows = db[table] as any[];

      db[table] = allRows.filter((r) => {
        const matches = ((filters as any[]) || []).every((f) => {
          const val = r[f.field];
          if (f.op === "eq") return val === f.value;
          if (f.op === "neq") return val !== f.value;
          if (f.op === "gte") return val >= f.value;
          if (f.op === "lte") return val <= f.value;
          if (f.op === "in") return Array.isArray(f.value) && f.value.includes(val);
          if (f.op === "not") {
            if (f.operator === "is") return val !== f.value;
            if (f.operator === "eq") return val !== f.value;
            if (f.operator === "in") return !f.value.includes(val);
            return val !== f.value;
          }
          return true;
        });

        if (matches) {
          deletedRows.push(r);
          return false; // exclude from kept list
        }
        return true;
      });

      await saveServerDb(db);
      return {
        data: deletedRows,
        error: null,
      };
    }

    return { data: null, error: { message: "Unsupported operation" } };
  });

// Chainable mock builder mimicking postgrest
export class MockQueryBuilder {
  private table: string;
  private filters: Array<{ field: string; op: string; value: any }> = [];
  private op: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: any = null;
  private orderByField: string | null = null;
  private orderAscending = true;
  private orderByCols: Array<{ field: string; ascending: boolean }> = [];
  private limitCount: number | null = null;
  private singleRow = false;
  private maybeSingleRow = false;

  constructor(table: string) {
    this.table = table;
  }

  select(fields?: string) {
    this.op = "select";
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push({ field, op: "eq", value });
    return this;
  }

  neq(field: string, value: any) {
    this.filters.push({ field, op: "neq", value });
    return this;
  }

  gte(field: string, value: any) {
    this.filters.push({ field, op: "gte", value });
    return this;
  }

  lte(field: string, value: any) {
    this.filters.push({ field, op: "lte", value });
    return this;
  }

  in(field: string, values: any[]) {
    this.filters.push({ field, op: "in", value: values });
    return this;
  }

  not(field: string, operator: string, value: any) {
    this.filters.push({ field, op: "not", operator, value });
    return this;
  }

  insert(payload: any) {
    this.op = "insert";
    this.payload = payload;
    return this;
  }

  update(payload: any) {
    this.op = "update";
    this.payload = payload;
    return this;
  }

  delete() {
    this.op = "delete";
    return this;
  }

  upsert(payload: any, options?: any) {
    this.op = "insert"; // Simulating upsert as insert for ease
    this.payload = payload;
    return this;
  }

  order(field: string, options?: { ascending: boolean }) {
    this.orderByCols.push({ field, ascending: options?.ascending ?? true });
    this.orderByField = field;
    this.orderAscending = options?.ascending ?? true;
    return this;
  }

  limit(num: number) {
    this.limitCount = num;
    return this;
  }

  single() {
    this.singleRow = true;
    return this;
  }

  maybeSingle() {
    this.maybeSingleRow = true;
    return this;
  }

  // To make it an custom thenable (Promise-like)
  async then(resolve: any, reject?: any) {
    try {
      const data = {
        table: this.table,
        op: this.op,
        filters: this.filters,
        payload: this.payload,
        orderByField: this.orderByField,
        orderAscending: this.orderAscending,
        orderByCols: this.orderByCols,
        limitCount: this.limitCount,
        singleRow: this.singleRow,
        maybeSingleRow: this.maybeSingleRow,
      };

      let result;
      if (typeof window === "undefined") {
        // Direct server-side execution
        result = await runMockDbOp({ data });
      } else {
        // RPC network call across server boundary
        result = await runMockDbOp({ data });
      }

      return resolve(result);
    } catch (e) {
      if (reject) return reject(e);
      throw e;
    }
  }
}
