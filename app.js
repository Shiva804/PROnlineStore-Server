require("dotenv").config();

const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./models");
const getcontroller = require("./Controllers/GET");
const postcontroller = require("./Controllers/POST");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const cookieSession = require("cookie-session");
const compression = require("compression");

app.use(compression());
app.set("trust proxy", 1); // trust first proxy
app.use(helmet());
app.use(
    cookieSession({
        name: "session",
        keys: ["key1", "key2"],
        secure: true,
        maxAge: 24 * 60 * 60 * 1000,
    })
);

app.use(
    cors({
        origin: ["https://www.pronlinestore.com"],
        // origin: ["http://localhost:3000"],
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    })
);
app.use(bodyParser.json());

db.sequelize.sync();

//Relationships
db.Cart.belongsTo(db.User, { foreignKey: "email" });
db.Cart.belongsTo(db.Product, { foreignKey: "product_name" });

//Auth Middlewares

//ADMIN Auth
const authenticateAdminToken = (req, res, next) => {
    const access_token = req.session.admin_access_token;
    const refresh_token = req.session.admin_refresh_token;

    if (access_token == null) return res.sendStatus(401);
    if (refresh_token == null) return res.sendStatus(401);

    jwt.verify(
        access_token,
        process.env.JWT_LOGIN_SECRET,
        async (err, user) => {
            if (err) {
                jwt.verify(
                    refresh_token,
                    process.env.JWT_REFRESH_TOKEN_SECRET,
                    (err, user) => {
                        if (err) {
                            req.session = null;
                            return res.sendStatus(403);
                        } else {
                            const access_token = jwt.sign(
                                { email: user.email },
                                process.env.JWT_LOGIN_SECRET,
                                {
                                    expiresIn: "30m",
                                }
                            );

                            const refresh_token = jwt.sign(
                                { email: user.email },

                                process.env.JWT_REFRESH_TOKEN_SECRET,
                                {
                                    expiresIn: "1d",
                                }
                            );
                            req.session.admin_access_token = access_token;
                            req.session.admin_refresh_token = refresh_token;
                            req.user = user;
                            next();
                        }
                    }
                );
            } else {
                req.user = user;
                next();
            }
        }
    );
};

//User auth
const authenticateToken = (req, res, next) => {
    const access_token = req.session.access_token;
    const refresh_token = req.session.refresh_token;

    if (access_token == null) return res.sendStatus(401);
    if (refresh_token == null) return res.sendStatus(401);

    jwt.verify(
        access_token,
        process.env.JWT_LOGIN_SECRET,
        async (err, user) => {
            if (err) {
                jwt.verify(
                    refresh_token,
                    process.env.JWT_REFRESH_TOKEN_SECRET,
                    (err, user) => {
                        if (err) {
                            req.session = null;
                            return res.sendStatus(403);
                        } else {
                            const access_token = jwt.sign(
                                { email: user.email },
                                process.env.JWT_LOGIN_SECRET,
                                {
                                    expiresIn: "15s",
                                }
                            );

                            const refresh_token = jwt.sign(
                                { email: user.email },

                                process.env.JWT_REFRESH_TOKEN_SECRET,
                                {
                                    expiresIn: "5d",
                                }
                            );
                            req.session.access_token = access_token;
                            req.session.refresh_token = refresh_token;

                            req.user = user;
                            return next();
                        }
                    }
                );
            } else {
                req.user = user;

                return next();
            }
        }
    );
};

//GET Requests

app.get("/subcategory/:category", getcontroller.subcategory);
app.get("/category", getcontroller.category);
app.get("/confirmation/:token", getcontroller.confirmation);
app.get("/products/:category", getcontroller.category_product);
app.get("/products/:category/:subcategory", getcontroller.sub_category_product);
app.get("/allproducts", getcontroller.allproducts);
app.get("/reset", getcontroller.reset);
app.get("/adminreset", getcontroller.admin_reset);
app.get("/cart/:email", authenticateToken, getcontroller.cart);
app.get("/orderid/:order_id", authenticateToken, getcontroller.order_id);
app.get("/myorders/:email", authenticateToken, getcontroller.my_orders);
app.get("/verifyreset", getcontroller.verify_reset_password);
app.get("/admindata", authenticateAdminToken, getcontroller.getAdminData);
app.get("/validateadmin", authenticateAdminToken, async (req, res) => {
    return res.sendStatus(200);
});
app.get("/validateuser", authenticateToken, async (req, res) => {
    try {
        const user = req.user.email;

        if (user) {
            const find_user = await db.User.findByPk(user);
            const cart = await db.Cart.findAll({
                where: {
                    email: user,
                    status: "in-cart",
                },
            });
            let quantity = 0;
            for (let i = 0; i < cart.length; i++) {
                quantity += cart[i].quantity;
            }
            res.status(200).json({
                name: find_user.name,
                email: find_user.email,
                cart: quantity,
            });
        } else {
            res.status(401).send("Unauthorized");
        }
    } catch (e) {
        res.status(400).send("Error Occured!");
    }
});

//POST Requests

app.post("/login", postcontroller.login);
app.post("/register", postcontroller.register);
// app.post("/message", authenticateToken, postcontroller.message);
app.post("/message", postcontroller.message);

app.post("/addcart", authenticateToken, postcontroller.add_cart);
app.post("/removecart", authenticateToken, postcontroller.remove_cart);
app.post("/razorpay", postcontroller.razor_pay);
app.post("/verification", postcontroller.verification);
app.post("/updateuser", postcontroller.update_user_password);
app.post("/logout", async (req, res) => {
    req.session.access_token = null;
    req.session.refresh_token = null;
    res.status(200).send("ok");
});
app.post("/adminlogout", async (req, res) => {
    req.session.admin_access_token = null;
    req.session.admin_refresh_token = null;
    res.status(200).send("ok");
});
app.post("/adminLogin", postcontroller.adminLogin);
app.post("/deliver", authenticateAdminToken, postcontroller.deliver);
app.post("/addproduct", authenticateAdminToken, postcontroller.add_product);
app.post("/updateprice", authenticateAdminToken, postcontroller.update_price);

//Start the server
app.listen(process.env.PORT || 5000, () => {
    console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++");
    console.log("+        PR ONLINE STORE SERVER STARTED            +");
    console.log("++++++++++++++++++++++++++++++++++++++++++++++++++++");
});
