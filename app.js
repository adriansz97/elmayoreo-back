import express from "express";
import { verificarApiKey, acceptRequest, addInventoryQty, addNewProduct, createPayment, createRequest, getAllRequest, getAllRequestByUser, getInventory, getOutlaysByDate, getPaymentById, getPayments, getProductById, getReportByDate, getRequestInfo, getSuccessRequest, updateDeliveryDate } from "./database.js";
import cors from "cors";
import { DB_HOST, DB_PORT } from "./config.js";


// El Mayorista desarrolla su API REST con Endpoints para 
// •	Consulta de Productos: (id, nombre del material, cantidad existente, precio unitario, precio por comprar de 0-100 unidades, 
// precio por comprar más de 100 unidades, precio sugerido al público) 

// •	Recepción de solicitudes de compra: donde se debe recibir un array de productos solicitados (cada uno con su identificador 
// y la cantidad solicitada). El endpoint debe responder si la petición es válida o si no existe el inventario suficiente de algún 
// artículo. En caso que la petición sea válida se debe informar el total de la compra y un número de orden.

// •	Recepción del pago (simulada): Se recibe la cantidad del monto total de la compra y el número de orden. En caso que la respuesta 
// sea exitosa, se confirma la compra e informa el día de entrega, en caso contrario se indica porque no se puede confirmar la compra: pago 
// insuficiente u orden no existente.  *Dinero *numero de orden *fecha de entrega

// Ahora recuerdas el endpoint que era para verificar la orden?. Necesito uno que 

const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // O puedes especificar un dominio en lugar de '*'
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.use(express.json());
app.use(cors());

// OBTENER todos los paquetes
app.post("/products/add", async (req, res) => {
  const { name, qty, unit_price, wholesale_price, retail_price } = req.body;
  await addNewProduct(res, name, qty, unit_price, wholesale_price, retail_price);
});

// OBTENER todos los paquetes
app.get("/products/", async (req, res) => {
  await getInventory(res);
});

// OBTENER todos los paquetes
app.put("/products/add-qty", async (req, res) => {
  const { product_id, qty, amount } = req.body;
  await addInventoryQty(res, product_id, qty, amount);
});

// OBTENER todos los paquetes
app.get("/product/:id", async (req, res) => {
  const { id } = req.params;
  await getProductById(res, id);
});

//* REQUESTS ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// CREAR una peticion
app.post("/request/", async (req, res) => {
  const { products, user } = req.body;
  await createRequest(res, products, user);
});

// OBTENER informacion de una peticion
app.get("/request/:order_id", async (req, res) => {
  const { order_id } = req.params;
  await getRequestInfo(res, order_id);
});

// VERIFICAR si la peticion puede ser satisfacida
app.get("/request/check/:order_id", async (req, res) => {
  const { order_id } = req.params;
  await getSuccessRequest(res, order_id);
});

// Ruta para obtener todas las solicitudes con sus productos asociados
app.get("/requests-all", async (req, res) => {
  await getAllRequest(res);
});

// Ruta para obtener todas las solicitudes con sus productos asociados
app.get("/requests/:user", async (req, res) => {
  const { user } = req.params;
  await getAllRequestByUser(res, user);
});

// Ruta para obtener todas las solicitudes con sus productos asociados
app.get("/accept-request/:order_id", async (req, res) => {
  const { order_id } = req.params;
  await acceptRequest(res, order_id);
});

//* PAYMENTS ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//? Crear un pago (Ellos)
app.post("/payment", async (req, res) => {
  const { order_id, total_amount } = req.body;
  await createPayment(res, order_id, total_amount);
});

//? Confirmar el dia de entrega
app.put("/payment/update-delivery", async (req, res) => {
  const { payment_id, delivery_date } = req.body;
  await updateDeliveryDate(res, payment_id, delivery_date);
});

//? Ver todos los pagos
app.get("/payments", async (req, res) => {
  await getPayments(res);
});

//? Ver un pago por id
app.get("/payment/:id", async (req, res) => {
  const { id } = req.params;
  await getPaymentById(res, id);
});

//* REPORTS ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//? Ver un pago por id
// curl -X GET 'http://localhost:3000/payments?startDate=2024-01-01&endDate=2024-01-31'
app.get("/report", async (req, res) => {
  const { startDate, endDate } = req.query;
  await getReportByDate(res, startDate, endDate);
});

// curl -X GET 'http://localhost:3000/payments?startDate=2024-01-01&endDate=2024-01-31'
app.get("/outlays", async (req, res) => {
  const { startDate, endDate } = req.query;
  await getOutlaysByDate(res, startDate, endDate);
});



app.listen(DB_PORT, () => {
  console.log(`Server running on port ${DB_PORT} ${DB_HOST} `);
});



app.get("api/products/", verificarApiKey, async (req, res) => {
  await getInventory(res);
});


