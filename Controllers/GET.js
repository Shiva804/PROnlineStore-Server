const db = require("../models");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const Razorpay = require("razorpay");

let key_id;
let key_secret;

if (process.env.NODE_ENV == "development") {
    key_id = process.env.DEV_KEY_ID;
    key_secret = process.env.DEV_KEY_SECRET;
} else {
    key_id = process.env.PROD_KEY_ID;
    key_secret = process.env.PROD_KEY_SECRET;
}

const razorpay = new Razorpay({
    key_id,
    key_secret,
});

let transporter = nodemailer.createTransport({
    service: "Godaddy",
    auth: {
        user: process.env.USER_ID,
        pass: process.env.PASSWORD,
    },
});

const category = async (req, res) => {
    try {
        const category = await db.Product.aggregate("category", "DISTINCT", {
            plain: false,
        });
        const categories = [];
        category.forEach((category) => {
            categories.push(category.DISTINCT);
        });

        res.status(200).send(categories);
    } catch (e) {
        res.status(500).send("Error Occured");
    }
};

const subcategory = async (req, res) => {
    try {
        const category = await db.Category.findAll({
            where: {
                category: req.params.category,
            },
        });
        const subcategories = [];
        category.forEach((category) => {
            if (category.sub_category != null)
                subcategories.push(category.sub_category);
        });

        res.status(200).send(subcategories);
    } catch (e) {
        res.status(500).send("Error Occured");
    }
};

const confirmation = async (req, res) => {
    try {
        const info = jwt.verify(req.params.token, process.env.JWT_SECRET);

        await db.User.update(
            {
                confirmed: true,
            },
            {
                where: { email: info.email },
            }
        );

        res.redirect("https://www.pronlinestore.com/");
    } catch (error) {
        res.status(500).send("Error Occured");
    }
};

const category_product = async (req, res) => {
    try {
        const products = await db.Product.findAll({
            where: {
                category: req.params.category,
            },
        });

        res.status(200).send(products);
    } catch (e) {
        res.status(500).send("Error Occured");
    }
};

const sub_category_product = async (req, res) => {
    try {
        const products = await db.Product.findAll({
            where: {
                sub_category: req.params.subcategory,
            },
        });

        res.status(200).send(products);
    } catch (e) {
        res.status(500).send("Error Occured");
    }
};

const reset = async (req, res) => {
    const query = Object.keys(req.query);

    if (query[0] == "email") {
        try {
            const find_user = await db.User.findByPk(req.query.email);

            if (find_user) {
                const emailToken = jwt.sign(
                    {
                        email: req.query.email,
                    },
                    process.env.JWT_SECRET,
                    { expiresIn: "30m" }
                );
                req.session.reset_token = emailToken;

                const url = `https://server.pronlinestore.com/reset?token=${emailToken}`;

                transporter.sendMail({
                    from: `"PR Online Store" ${process.env.USER_ID}`,
                    to: req.query.email,
                    subject: "Reset Password!",
                    html: `
                    <h3>Please click the link below to reset your password!</h3>
                    <h4>${url}</h4>
                    <br/>
                <br/>    

                <h4>Happy Shopping!</h4>
                
            <br/>
            <br/>
            <br/>


            <div class="default-style"><hr />
<h3>PR Online Store</h3>
Thangaraj M G<br />+91 98408 99464<br />No:5/10, 3rd Cross Street,<br />Thirupathi Nagar, Kolathur.<br />Chennai, Tamil Nadu 600099</div>

            
            `,
                });
                res.status(200).send("mail sent");
            } else {
                res.status(404).send("Email not found!");
            }
        } catch (e) {
            res.status(500).send(e);
        }
    }

    if (query[0] == "token") {
        try {
            jwt.verify(req.query.token, process.env.JWT_SECRET, (err, user) => {
                res.redirect(
                    `https://www.pronlinestore.com/resetpassword/${req.query.token}/${user.email}`
                );
            });
        } catch (error) {
            res.status(500).send("Error Occured");
        }
    }
};

const admin_reset = async (req, res) => {
    const query = Object.keys(req.query);

    if (query[0] == "email") {
        try {
            const find_user = await db.User.findByPk(req.query.email);

            if (find_user) {
                if (find_user.role == "admin") {
                    const emailToken = jwt.sign(
                        {
                            email: req.query.email,
                        },
                        process.env.JWT_SECRET,
                        { expiresIn: "1d" }
                    );
                    req.session.reset_token = emailToken;

                    const url = `https://server.pronlinestore.com/adminreset?token=${emailToken}`;

                    transporter.sendMail({
                        from: `"PR Online Store" ${process.env.USER_ID}`,
                        to: req.query.email,
                        subject: "Reset Password!",

                        html: `
                        <h3>Please click the link below to reset your password!</h3>
                        <h4>${url}</h4>
    
                        <br/>
                        <br/>
                        <br/>

                <div class="default-style"><hr />
    <h3>PR Online Store</h3>
    Thangaraj M G<br />+91 98408 99464<br />No:5/10, 3rd Cross Street,<br />Thirupathi Nagar, Kolathur.<br />Chennai, Tamil Nadu 600099</div>
    
            `,
                    });
                    res.status(200).send("mail sent");
                } else {
                    res.status(404).send(
                        "Only admin password can be resetted!"
                    );
                }
            } else {
                res.status(404).send("Email not found!");
            }
        } catch (e) {
            res.status(500).send(e);
        }
    }

    if (query[0] == "token") {
        try {
            jwt.verify(req.query.token, process.env.JWT_SECRET, (err, user) => {
                res.redirect(
                    `https://www.pronlinestore.com/resetpassword/${req.query.token}/${user.email}`
                );
            });
        } catch (error) {
            res.status(500).send("Error Occured");
        }
    }
};

const verify_reset_password = async (req, res) => {
    if (req.query.token == req.session.reset_token) {
        return res.sendStatus(200);
    } else {
        return res.sendStatus(403);
    }
};

const cart = async (req, res) => {
    try {
        const cartproducts = await db.Cart.findAll({
            where: {
                email: req.params.email,
                status: "in-cart",
            },
            include: [db.Product],
        });
        let quantity = 0;
        let total = 0;

        for (let i = 0; i < cartproducts.length; i++) {
            quantity += cartproducts[i].quantity;
            let price = cartproducts[i].Product.price.replace(",", "");
            total += Math.round(
                (price - price * (25 / 100)) * cartproducts[i].quantity
            );
        }
        let gst = Math.round(total * (18 / 100));
        let subtotal = total + gst;

        res.status(200).json({
            cartproducts: cartproducts,
            quantity: quantity,
            total: total,
            subtotal: Math.round(subtotal),
            gst: gst,
        });
    } catch (e) {
        res.status(500).send("Error Occured");
    }
};

const allproducts = async (req, res) => {
    try {
        const products = await db.Product.findAll();
        res.status(200).send(products);
    } catch (error) {
        res.status(500).send("Error Occured");
    }
};

const order_id = async (req, res) => {
    const order_id = await razorpay.orders.fetch(req.params.order_id);
    res.status(200).send(order_id);
};

const my_orders = async (req, res) => {
    try {
        const orders = await db.Cart.findAll({
            where: {
                email: req.params.email,
                status: "paid",
            },
            include: [db.Product],
            order: [["updatedAt", "DESC"]],
        });
        res.status(200).json({
            orders: orders,
        });
    } catch (e) {
        res.status(500).send("Error Occured");
    }
};

const getAdminData = async (req, res) => {
    const products = await db.Product.findAll({
        order: [["category", "ASC"]],
    });
    const cart = await db.Cart.findAll({
        where: {
            status: "paid",
        },
        order: [["updatedAt", "DESC"]],
    });

    res.status(200).json({
        products: products,
        cart: cart,
    });
};

module.exports = {
    category,
    subcategory,
    confirmation,
    category_product,
    sub_category_product,
    reset,
    cart,
    allproducts,
    order_id,
    my_orders,
    verify_reset_password,
    getAdminData,
    admin_reset,
};
