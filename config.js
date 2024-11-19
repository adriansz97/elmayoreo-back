
// export const PORT = process.env.PORT || "8080";
export const PORT = "8080";

// export const DB_HOST = "127.0.0.1";
// export const DB_USER = "adrian";
// export const DB_PASSWORD = "12345";
// export const DB_DATABASE = "MAYOREO";
// export const DB_PORT = "3306";

export const DB_HOST = process.env.MYSQL_HOST || "127.0.0.1";
export const DB_USER = process.env.MYSQL_USER || "adrian";
export const DB_PASSWORD = process.env.MYSQL_PASSWORD || "12345";
export const DB_DATABASE = process.env.MYSQL_DATABASE || "MAYOREO";
export const DB_PORT = process.env.MYSQL_PORT || "3306";

// export const DB_HOST = "mysql.railway.internal";
// export const DB_USER = "root";
// export const DB_PASSWORD = "EfYJfFtOBlsPHYbMXUnRGYhxjHmafXuk";
// export const DB_DATABASE = "railway";
// export const DB_PORT = "3306";