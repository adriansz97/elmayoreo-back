import mysql from "mysql2";
// import { createConnection } from "mysql2/promise";
import dotenv from "dotenv";
import { DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE, DB_PORT } from "./config.js";
dotenv.config();

const pool = mysql
  .createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_DATABASE,
    port: DB_PORT,
  })
  .promise();



//* INVENTARIO ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Función para agregar un nuevo producto al inventario
export async function addNewProduct(res, name, qty, unit_price, wholesale_price, retail_price) {
  console.log(name, qty, unit_price, wholesale_price);

  // Validar que los campos sean correctos
  if (!name || !Number.isInteger(qty) || !Number.isFinite(unit_price) || !Number.isFinite(wholesale_price) || !Number.isFinite(retail_price)) {
    return res.status(400).send('Los campos "name", "qty", "unit_price", "wholesale_price" y "retail_price son obligatorios.');
  }

  const connection = await pool.getConnection();

  try {
    // Insertar el nuevo producto en la tabla inventory
    const [result] = await connection.query(
      'INSERT INTO inventory (name, qty, unit_price, wholesale_price, retail_price) VALUES (?, ?, ?, ?, ?)',
      [name, qty, unit_price, wholesale_price, retail_price]
    );

    // Responder con un mensaje de éxito y el ID del nuevo producto
    res.status(201).json({ id: result.insertId, name, qty, unit_price, wholesale_price, retail_price });
  } catch (error) {
    console.error('Error al agregar el producto al inventario:', error);
    res.status(500).send('Error al agregar el producto al inventario.');
  } finally {
    connection.release(); // Liberar la conexión
  }
}


// Funcion para obtener el inventario
export async function getInventory(res) {
  
  const connection = await pool.getConnection();

  try {
    // Consultar todos los registros de la tabla inventory
    const [results] = await connection.query('SELECT * FROM inventory');
    
    // Responder con los datos obtenidos
    res.json(results);
  } catch (error) {
    console.error('Error al obtener los productos del inventario:', error);
    res.status(500).send('Error al obtener los productos del inventario.');
  } finally {
    connection.release(); // Liberar la conexión
  }
}

// Función para actualizar la cantidad (qty) de un producto en el inventario
// Endpoint para agregar entradas de productos al inventario y registrar en outlays
export async function addInventoryQty(res, product_id, qty, amount) {

  if (!product_id || !qty || !amount) {
    return res.status(400).send('Faltan parámetros. Se requiere product_id, qty y amount.');
  }

  const connection = await pool.getConnection();

  try {
    // Iniciar transacción
    await connection.beginTransaction();

    // Actualizar la cantidad del producto en el inventario
    const [inventoryResult] = await connection.query(
      'UPDATE inventory SET qty = qty + ? WHERE id = ?',
      [qty, product_id]
    );

    if (inventoryResult.affectedRows === 0) {
      return res.status(404).send('Producto no encontrado en el inventario.');
    }

    // Insertar registro en la tabla de outlays
    await connection.query(
      'INSERT INTO outlays (product_id, qty, amount) VALUES (?, ?, ?)',
      [product_id, qty, amount]
    );

    // Confirmar la transacción
    await connection.commit();

    res.status(201).send('Entrada de producto registrada exitosamente y registrada en outlays.');
  } catch (error) {
    // En caso de error, revertir transacción
    await connection.rollback();
    console.error('Error al registrar la entrada de productos:', error);
    res.status(500).send('Error al registrar la entrada de productos.');
  } finally {
    connection.release(); // Liberar la conexión
  }
}

// Funcion para obtener el inventario
export async function getProductById(res, id) {

  if (!Number.isInteger(parseInt(id))) {
    return res.status(400).send('El parámetro "id" debe ser un número entero.');
  }

  const connection = await pool.getConnection();

  try {
    // Consultar el producto por su id en la tabla inventory
    const [productResult] = await connection.query('SELECT * FROM inventory WHERE id = ?', [id]);

    if (productResult.length === 0) {
      return res.status(404).send('Producto no encontrado.');
    }

    // Responder con la información del producto
    res.json(productResult[0]);
  } catch (error) {
    console.error('Error al obtener el producto:', error);
    res.status(500).send('Error al obtener el producto.');
  } finally {
    connection.release(); // Liberar la conexión
  }

}

//* REQUESTS ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Función para crear una nueva solicitud
export async function createRequest(res, products, user) {
  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).send('El campo "products" debe ser un array de productos.');
  }
  if (typeof user !== "string" || user.length === 0) {
    return res.status(400).send('El campo "user" debe ser un texto.');
  }

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Insertar la solicitud con el status inicial 'pending'
    const [requestResult] = await connection.query('INSERT INTO requests (status, user) VALUES (?, ?)', ['pending', user]);

    const order_id = requestResult.insertId;

    // Preparar los datos para la inserción en request_items
    const requestItems = products.map(product => [order_id, product.product_id, product.qty]);

    // Insertar los detalles de la solicitud
    await connection.query('INSERT INTO request_items (order_id, product_id, qty) VALUES ?', [requestItems]);

    // Confirmar la transacción
    await connection.commit();

    // Responder con el id de la solicitud creada y el estado
    res.status(201).json({ user, order_id, status: 'pending' });
  } catch (error) {
    await connection.rollback();
    console.error('Error al crear la solicitud:', error);
    res.status(500).send('Error al crear la solicitud.');
  } finally {
    connection.release(); // Liberar la conexión
  }
}

// Función para obtener la informacion de una solicitud
export async function getAllRequest(res) {
  const connection = await pool.getConnection();

  try {
    // Obtener todas las solicitudes de la tabla requests
    const [requests] = await connection.query("SELECT * FROM requests ");

    console.log(requests);

    if (requests.length === 0) {
      return res.status(404).send("No se encontraron solicitudes.");
    }

    // Para cada solicitud, obtener sus productos asociados
    const requestsWithItems = await Promise.all(
      requests.map(async (request) => {
        const [items] = await connection.query(
          "SELECT product_id, qty FROM request_items WHERE order_id = ?",
          [request.order_id]
        );

        return {
          ...request,
          items: items,
        };
      })
    );

    // Responder con todas las solicitudes y sus productos
    res.json(requestsWithItems);
  } catch (error) {
    console.error("Error al obtener las solicitudes:", error);
    res.status(500).send("Error al obtener las solicitudes.");
  } finally {
    connection.release(); // Liberar la conexión
  }
}

// Función para obtener la informacion de una solicitud
export async function getAllRequestByUser(res, user) {
  
  const connection = await pool.getConnection();

  try {
    // Obtener todas las solicitudes de la tabla requests
    const [requests] = await connection.query('SELECT * FROM requests WHERE user = ?', [user]);

    console.log(requests);

    if (requests.length === 0) {
      return res.status(404).send("No se encontraron solicitudes.");
    }

    // Para cada solicitud, obtener sus productos asociados
    const requestsWithItems = await Promise.all(
      requests.map(async (request) => {
        const [items] = await connection.query(
          "SELECT product_id, qty FROM request_items WHERE order_id = ?",
          [request.order_id]
        );

        return {
          ...request,
          items: items,
        };
      })
    );

    // Responder con todas las solicitudes y sus productos
    res.json(requestsWithItems);
  } catch (error) {
    console.error("Error al obtener las solicitudes:", error);
    res.status(500).send("Error al obtener las solicitudes.");
  } finally {
    connection.release(); // Liberar la conexión
  }
}

// Función para obtener la información de una solicitud y calcular el total_amount
export async function getRequestInfo(res, order_id) {
  if (!Number.isInteger(parseInt(order_id))) {
    return res.status(400).send('El parámetro "order_id" debe ser un número entero.');
  }

  const connection = await pool.getConnection();

  try {
    // Consultar la información general de la solicitud
    const [requestResult] = await connection.query('SELECT * FROM requests WHERE order_id = ?', [order_id]);

    if (requestResult.length === 0) {
      return res.status(404).send('Solicitud no encontrada.');
    }

    // Consultar los detalles de los productos asociados a la solicitud
    const [itemsResult] = await connection.query(
      `SELECT ri.product_id, ri.qty, i.name, i.unit_price, i.wholesale_price 
       FROM request_items ri
       JOIN inventory i ON ri.product_id = i.id
       WHERE ri.order_id = ?`,
      [order_id]
    );

    // Calcular el total_amount basado en las cantidades y precios
    let totalAmount = 0;

    const itemsWithPrices = itemsResult.map(item => {
      const pricePerUnit = item.qty >= 100 ? item.wholesale_price : item.unit_price;
      const totalPrice = pricePerUnit * item.qty;
      totalAmount += totalPrice;

      return {
        product_id: item.product_id,
        name: item.name,
        qty: item.qty,
        price_per_unit: pricePerUnit,
        total_price: totalPrice
      };
    });

    // Responder con la información de la solicitud, los productos, y el total_amount
    res.json({
      order_id: requestResult[0].order_id,
      status: requestResult[0].status,
      items: itemsWithPrices,
      total_amount: totalAmount
    });
  } catch (error) {
    console.error('Error al obtener la solicitud:', error);
    res.status(500).send('Error al obtener la solicitud.');
  } finally {
    connection.release(); // Liberar la conexión
  }
}

// Funcion para ver si los productos en el inventario son los suficiontes
export async function getSuccessRequest (res, order_id)  {
  if (!Number.isInteger(parseInt(order_id))) {
    return res.status(400).send('El parámetro "order_id" debe ser un número entero.');
  }

  const connection = await pool.getConnection();

  try {
    // Iniciar transacción para asegurar consistencia durante la verificación
    await connection.beginTransaction();

    // Obtener los detalles de los productos en la solicitud
    const [requestItems] = await connection.query(
      "SELECT product_id, qty FROM request_items WHERE order_id = ?",
      [order_id]
    );

    if (requestItems.length === 0) {
      return res
        .status(404)
        .send("No se encontraron productos para esta solicitud.");
    }

    // Verificar las cantidades disponibles en el inventario
    const insufficientProducts = []; // Lista para productos que no tienen suficiente inventario

    for (const item of requestItems) {
      const [inventoryResult] = await connection.query(
        "SELECT qty FROM inventory WHERE id = ?",
        [item.product_id]
      );

      if (inventoryResult.length === 0) {
        insufficientProducts.push({
          product_id: item.product_id,
          message: "Producto no encontrado en inventario",
        });
      } else if (inventoryResult[0].qty < item.qty) {
        insufficientProducts.push({
          product_id: item.product_id,
          requested_qty: item.qty,
          available_qty: inventoryResult[0].qty,
        });
      }
    }

    await connection.commit(); // Confirmar la transacción

    // Responder según el resultado de la verificación
    if (insufficientProducts.length === 0) {
      res
        .status(200)
        .send("La orden puede proceder, hay suficiente inventario disponible.");
    } else {
      console.log(insufficientProducts);
      res.status(400).json({
        message: "No hay productos suficientes para surtir la orden.",
        insufficientProducts,
      });
    }
  } catch (error) {
    await connection.rollback(); // Revertir transacción en caso de error
    console.error("Error al verificar el inventario:", error);
    res.status(500).send("Error al verificar el inventario.");
  } finally {
    connection.release(); // Liberar la conexión
  }
}

// Endpoint para restar productos del inventario y cambiar el status de la solicitud a 'accepted'
export async function acceptRequest(res, order_id) {
  if (!Number.isInteger(parseInt(order_id))) {
    return res.status(400).send('El parámetro "order_id" debe ser un número entero.');
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Verificar los productos asociados a la solicitud
    const [itemsResult] = await connection.query(
      `SELECT ri.product_id, ri.qty, i.qty as inventory_qty, i.name
        FROM request_items ri
        JOIN inventory i ON ri.product_id = i.id
        WHERE ri.order_id = ?`, [order_id]);

    // Verificar si hay suficiente inventario para cada producto
    const insufficientItems = itemsResult.filter(item => item.qty > item.inventory_qty);

    if (insufficientItems.length > 0) {
      return res.status(400).json({
        message: 'No hay productos suficientes para completar la solicitud.',
        insufficientItems: insufficientItems.map(item => ({
          product_id: item.product_id,
          name: item.name,
          requested_qty: item.qty,
          available_qty: item.inventory_qty
        }))
      });
    }

      // Restar productos del inventario
      for (let item of itemsResult) {
        await connection.query(
          'UPDATE inventory SET qty = qty - ? WHERE id = ?', [item.qty, item.product_id]
        );
      }

    // Actualizar el status de la solicitud a 'accepted'
    await connection.query('UPDATE requests SET status = ? WHERE order_id = ?', ['accepted', order_id]);

    await connection.commit();

    // Responder con éxito
    res.status(200).json({ message: 'La solicitud ha sido aceptada y los productos han sido descontados del inventario.' });
  } catch (error) {
      await connection.rollback();
      console.error('Error al aceptar la solicitud:', error);
      res.status(500).send('Error al aceptar la solicitud.');
  } finally {
      connection.release(); // Liberar la conexión
  }
}

//* PAYMENTS ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


// Función para crear un nuevo registro de pago
export async function createPayment(res, order_id, total_amount) {

  // Validar la entrada
  if (!order_id || !total_amount || !Number.isFinite(total_amount)) {
    return res.status(400).send('Los campos "order_id" y "total_amount" son obligatorios y deben ser válidos.');
  }

  const connection = await pool.getConnection();

  try {
    // Iniciar una transacción
    await connection.beginTransaction();

    // Insertar el nuevo pago en la tabla payments
    const [result] = await connection.query(
      'INSERT INTO payments (order_id, total_amount, delivery_date) VALUES (?, ?, ?)',
      [order_id, total_amount, '2000-01-01']
    );

    // Actualizar el estado de la solicitud (request) a 'paid'
    await connection.query(
      'UPDATE requests SET status = ? WHERE order_id = ?',
      ['paid', order_id]
    );

    // Confirmar la transacción
    await connection.commit();

    // Responder con un mensaje de éxito
    res.status(201).send(`Pago creado y solicitud actualizada a "paid". Payment ID: ${result.insertId}`);
  } catch (error) {
    // Si hay un error, revertir la transacción
    await connection.rollback();
    console.error('Error al crear el pago o actualizar la solicitud:', error);
    res.status(500).send('Error al crear el pago o actualizar la solicitud.');
  } finally {
    connection.release(); // Liberar la conexión
  }







}

export async function getPayments(res) {
  
  const connection = await pool.getConnection();

  try {
    // Consultar todos los registros de la tabla inventory
    const [results] = await connection.query('SELECT * FROM payments');
    
    // Responder con los datos obtenidos
    res.json(results);
  } catch (error) {
    console.error('Error al obtener los pagos:', error);
    res.status(500).send('Error al obtener los pagos.');
  } finally {
    connection.release(); // Liberar la conexión
  }
}

// Funcion para obtener el inventario
export async function getPaymentById(res, id) {

  if (!Number.isInteger(parseInt(id))) {
    return res.status(400).send('El parámetro "id" debe ser un número entero.');
  }

  const connection = await pool.getConnection();

  try {
    // Consultar el producto por su id en la tabla inventory
    const [productResult] = await connection.query('SELECT * FROM payments WHERE payment_id = ?', [id]);

    if (productResult.length === 0) {
      return res.status(404).send('Producto no encontrado.');
    }

    // Responder con la información del producto
    res.json(productResult[0]);
  } catch (error) {
    console.error('Error al obtener el producto:', error);
    res.status(500).send('Error al obtener el producto.');
  } finally {
    connection.release(); // Liberar la conexión
  }

}

// Función para actualizar la fecha de entrega (delivery_date) en un pago
export async function updateDeliveryDate(res, payment_id, delivery_date) {

  console.log(payment_id, delivery_date);

  if (!payment_id || !delivery_date) {
    return res.status(400).send('Los campos "payment_id" y "delivery_date" son obligatorios.');
  }

  const connection = await pool.getConnection();

  try {
    const [result] = await connection.query(
      'UPDATE payments SET delivery_date = ? WHERE payment_id = ?',
      [delivery_date, payment_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).send('Pago no encontrado.');
    }

    res.status(200).send('Fecha de entrega actualizada con éxito.');
  } catch (error) {
    console.error('Error al actualizar la fecha de entrega:', error);
    res.status(500).send('Error al actualizar la fecha de entrega.');
  } finally {
    connection.release();
  }
}

//* REPORTS ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Función para obtener los pagos entre dos fechas
export async function getReportByDate(res, startDate, endDate) {

  // Validar que ambas fechas sean proporcionadas
  if (!startDate || !endDate) {
    return res.status(400).send('Los parámetros "startDate" y "endDate" son requeridos.');
  }

  const connection = await pool.getConnection();

  try {
    // Realizar la consulta a la tabla de payments filtrando por el rango de fechas
    const [payments] = await connection.query(
      'SELECT * FROM payments WHERE delivery_date BETWEEN ? AND ?',
      [startDate, endDate]
    );

    // Verificar si se encontraron pagos
    if (payments.length === 0) {
      return res.status(404).send('No se encontraron pagos en el rango de fechas especificado.');
    }

    // Responder con los pagos encontrados
    res.json(payments);
  } catch (error) {
    console.error('Error al obtener los pagos por rango de fechas:', error);
    res.status(500).send('Error al obtener los pagos.');
  } finally {
    connection.release(); // Liberar la conexión
  }
}

// Endpoint para obtener los registros de outlays entre dos fechas
export async function getOutlaysByDate(res, startDate, endDate) {

  // Validar que ambas fechas sean proporcionadas
  if (!startDate || !endDate) {
    return res.status(400).send('Los parámetros "startDate" y "endDate" son requeridos.');
  }

  const connection = await pool.getConnection();

  try {
    // Realizar la consulta a la tabla outlays filtrando por el rango de fechas
    const [outlays] = await connection.query(
      'SELECT * FROM outlays WHERE entry_date BETWEEN ? AND ?',
      [startDate, endDate]
    );

    // Verificar si se encontraron registros
    if (outlays.length === 0) {
      return res.status(404).send('No se encontraron registros en el rango de fechas especificado.');
    }

    // Responder con los registros encontrados
    res.json(outlays);
  } catch (error) {
    console.error('Error al obtener los registros de outlays por rango de fechas:', error);
    res.status(500).send('Error al obtener los registros de outlays.');
  } finally {
    connection.release(); // Liberar la conexión
  }
}
