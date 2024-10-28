const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const SSLCommerzPayment = require("sslcommerz-lts");

const allowedOrigins = [
  "https://grand-belekoy-289c4e.netlify.app",
  "http://localhost:5173",
];
const app = express();
const port = process.env.PORT || 5000;
const store_id = process.env.SSL_id;
const store_passwd = process.env.SSL_pass;
const is_live = false;

// Middleware
app.use(cors({ origin: "*" }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// const authenticateToken = (req, res, next) => {
//     const token = req.headers['authorization']?.split(' ')[1];

//     if (!token) return res.sendStatus(401);

//     jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
//         if (err) return res.sendStatus(403);
//         req.user = user;
//         next();
//     });
// };

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ebsbi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();
    console.log("Connected to MongoDB!");

    const allMedsCollection = client.db("Mediore").collection("AllMeds");
    const allUsersCollection = client.db("Mediore").collection("AllUsers");
    const cartCollection = client.db("Mediore").collection("Cart");
    const orderCollection = client.db("Mediore").collection("Order");

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    app.get("/", (req, res) => {
      res.send("Welcome to the Mediore API!");
    });

    app.post("/allusers", async (req, res) => {
      try {
        const { name, email, photoURL } = req.body;
        const newUser = { name, email, photoURL, role: "user" };
        const query = { email };
        const existingUser = await allUsersCollection.findOne(query);
        if (existingUser) {
          return res.send({ message: "User already exists", insertedId: null });
        }

        const result = await allUsersCollection.insertOne(newUser);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error inserting user:", error);
        res.status(500).send({ message: "Failed to add user" });
      }
    });

    app.post("/cart", async (req, res) => {
      try {
        const {
          productId,
          productName,
          selectedSize,
          selectedPrice,
          userEmail,
          selectedId,
          img,
          category,
          manufacturer,
        } = req.body;

        const newCartItem = {
          productId,
          productName,
          selectedSize,
          selectedPrice,
          userEmail,
          createdAt: new Date(),
          selectedId,
          img,
          category,
          manufacturer,
        };

        const result = await cartCollection.insertOne(newCartItem);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error adding item to cart:", error);
        res.status(500).send({ message: "Failed to add item to cart" });
      }
    });

    app.delete("/cart/:id", async (req, res) => {
      const { id } = req.params;
      try {
        await cartCollection.deleteOne({ _id: new ObjectId(id) });
        res.status(200).send({ message: "Item deleted successfully" });
      } catch (error) {
        res.status(500).send({ error: "Failed to delete item" });
      }
    });

    app.get("/allusers", async (req, res) => {
      const result = await allUsersCollection.find().toArray();
      res.send(result);
    });

    app.get("/cart", async (req, res) => {
      const result = await cartCollection.find().toArray();
      res.send(result);
    });

    app.get("/allmeds", async (req, res) => {
      const result = await allMedsCollection.find().toArray();
      res.send(result);
    });

    app.put("/allmeds/:id", async (req, res) => {
      const { id } = req.params;
      const {
        medicine_name,
        category_name,
        generic_name,
        strength,
        manufacturer_name,
        slug,
        discount_type,
        discount_value,
        is_discountable,
        is_available,
        medicine_image,
        popularity_category,
        unit_prices,
      } = req.body;

      const updatedProduct = {
        medicine_name,
        category_name,
        generic_name,
        strength,
        manufacturer_name,
        slug,
        discount_type,
        discount_value,
        is_discountable,
        is_available,
        medicine_image,
        popularity_category,
        unit_prices,
      };

      try {
        const result = await allMedsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedProduct }
        );
        if (result.modifiedCount === 1) {
          res.status(200).send({ message: "Product updated successfully" });
        } else {
          res.status(404).send({ message: "Product not found" });
        }
      } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).send({ message: "Failed to update product" });
      }
    });

    app.delete("/allmeds/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const result = await allMedsCollection.deleteOne({
          _id: new ObjectId(id),
        });
        if (result.deletedCount === 1) {
          res.status(200).send({ message: "Product deleted successfully" });
        } else {
          res.status(404).send({ message: "Product not found" });
        }
      } catch (error) {
        console.error("Error deleting product:", error);
        res.status(500).send({ message: "Failed to delete product" });
      }
    });

    app.get("/checkout", async (req, res) => {
      const result = await checkOutCollection.find().toArray();
      res.send(result);
    });

    app.get("/order", async (req, res) => {
      const result = await orderCollection.find().toArray();
      res.send(result);
    });

    const tran_Id = new ObjectId().toString();

    app.post("/checkout", async (req, res) => {
      const checkoutData = req.body;
      console.log(checkoutData.name);
    
      const tran_Id = `TRAN_${new Date().getTime()}`; 
      const data = {
        total_amount: checkoutData.totalPrice,
        currency: checkoutData.currency,
        tran_id: tran_Id,
        success_url: `http://localhost:5173/payment/success/${tran_Id}`,
        fail_url: "http://localhost:5000/fail",
        cancel_url: "http://localhost:5000/cancel",
        ipn_url: "http://localhost:5000/ipn",
        shipping_method: "Courier",
        product_name: "Computer.",
        product_category: "Electronic",
        product_profile: "general",
        cus_name: checkoutData.name,
        cus_email: checkoutData.email,
        cus_add1: checkoutData.address,
        cus_city: "Dhaka",
        cus_state: "Dhaka",
        cus_postcode: "1216",
        cus_country: "Bangladesh",
        cus_phone: checkoutData.contactNumber,
        ship_name: checkoutData.name,
        ship_add1: checkoutData.address,
        ship_city: checkoutData.address,
        ship_state: checkoutData.address,
        ship_postcode: 1216,
        ship_country: "Bangladesh",
      };
    
      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
      sslcz.init(data).then(async (apiResponse) => {
        const GatewayPageURL = apiResponse.GatewayPageURL;
        res.send({ url: GatewayPageURL }); 
    
        console.log("Redirecting to: ", GatewayPageURL);
    
        try {
          const cartItems = await cartCollection.find({ userEmail: checkoutData.email }).toArray();
    
          const finalOrder = {
            email: checkoutData.email,
            createdAt: new Date(),
            currency: checkoutData.currency,
            amount: checkoutData.totalPrice,
            productList: cartItems,
            transactionId: tran_Id, 
          };
          const result = await orderCollection.insertOne(finalOrder);
          console.log("Order saved:", result);
    
          await cartCollection.deleteMany({ userEmail: checkoutData.email });
          if(result.modifiedCount > 0){
res.redirect(`http://5173/payment/success/${tran_Id}`)
          }
        } catch (error) {
          console.error("Error saving order:", error);
          res.status(500).send("Failed to save order data.");
        }
      });
    });
    
    
    

    app.post("/payment/success/:tranId", async (req, res) => {
      console.log("Payment Successful", req.params.tranId);
    });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Mediore Server is Running");
});
app.listen(port, () => {
  console.log(`Mediore Server is listening on ${port}`);
});
