const { nanoid } = require("nanoid");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const nodemailer = require("nodemailer");
const Razorpay = require("razorpay");
const db = require("../models");
const jwt = require("jsonwebtoken");
const easyinvoice = require("easyinvoice");
const imageToBase64 = require("image-to-base64");
const orderid = require("order-id")("mysecret");
const moment = require("moment");

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

let logo_base;

imageToBase64("./static/download.png") // Path to the image
    .then((response) => {
        logo_base = response; // "cGF0aC90by9maWxlLmpwZw=="
    })
    .catch((error) => {
        console.log(error); // Logs an error if there was one
    });
let transporter = nodemailer.createTransport({
    service: "Godaddy",
    auth: {
        user: process.env.USER_ID,
        pass: process.env.PASSWORD,
    },
});

const login = async (req, res) => {
    try {
        const find_user = await db.User.findByPk(req.body.email);
        if (find_user) {
            if (find_user.confirmed == 1) {
                const password = await bcrypt.compare(
                    req.body.password,
                    find_user.password
                );

                if (password) {
                    const email = { email: req.body.email };
                    const access_token = jwt.sign(
                        email,
                        process.env.JWT_LOGIN_SECRET,
                        { expiresIn: "15s" }
                    );

                    const refresh_token = jwt.sign(
                        email,
                        process.env.JWT_REFRESH_TOKEN_SECRET,
                        { expiresIn: "5d" }
                    );
                    req.session.access_token = access_token;
                    req.session.refresh_token = refresh_token;

                    const cart = await db.Cart.findAll({
                        where: { email: req.body.email, status: "in-cart" },
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
                    res.status(400).send("Check Password");
                }
            } else {
                res.status(400).send(
                    "Please confirm your email before continuing "
                );
            }
        } else {
            res.status(400).send("User not found");
        }
    } catch (e) {
        res.status(500).send("Error Occured");
    }
};

const adminLogin = async (req, res) => {
    try {
        const find_user = await db.User.findByPk(req.body.email);
        if (find_user && find_user.role == "admin") {
            const password = await bcrypt.compare(
                req.body.password,
                find_user.password
            );

            if (password) {
                const email = { email: req.body.email };
                const access_token = jwt.sign(
                    email,
                    process.env.JWT_LOGIN_SECRET,
                    {
                        expiresIn: "30m",
                    }
                );

                const refresh_token = jwt.sign(
                    email,
                    process.env.JWT_REFRESH_TOKEN_SECRET,
                    {
                        expiresIn: "1d",
                    }
                );
                req.session.admin_access_token = access_token;
                req.session.admin_refresh_token = refresh_token;

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
            } else {
                res.status(400).send("Incorrect Password!");
            }
        } else {
            res.status(403).send("Sorry, Only admin can login!");
        }
    } catch (e) {
        res.status(400).send("Error Occured");
    }
};

const register = async (req, res) => {
    try {
        const password = await bcrypt.hash(req.body.password, saltRounds);

        const checkuser = await db.User.findByPk(req.body.email);

        if (!checkuser) {
            await db.User.create({
                name: req.body.name,
                email: req.body.email,
                password: password,
            });

            const emailToken = jwt.sign(
                {
                    email: req.body.email,
                },
                process.env.JWT_SECRET
            );
            const url = `http://localhost:5000/confirmation/${emailToken}`;
            transporter.sendMail({
                from: `"PR Online Store" ${process.env.USER_ID}`,
                to: req.body.email,
                subject:
                    "Welcome to PR Online Store, Please activate your account!",
                html: `<h3>Hello ${req.body.name},Welcome to PR Online Store Please click the link below to activate your account !</h3>
                
                <h4>${url}</h4>
                <br/>
                <br/>    

                <h4>Happy Shopping!</h4>
                
            <br/>
            <br/>
            <br/>
            

            <div class="default-style"><hr />
            <h3>PR Online Store</h3>
            Thangaraj M G <br />+91 98408 99464<br />No:5/10, 3rd Cross Street,<br />Thirupathi Nagar, Kolathur.<br />Chennai, Tamil Nadu 600099</div>
            
                `,
            });

            res.status(200).send("Created");
        } else {
            res.status(400).send("Email already exists");
        }
    } catch (e) {
        res.status(500).send("Error Occured");
    }
};

const message = async (req, res) => {
    try {
        if (req.body.phone) {
            transporter.sendMail({
                from: `"PR Online Store" ${process.env.USER_ID}`, //support mail
                to: process.env.EMAIL_ID, //company mail
                subject: `Query from ${req.body.email}`,
                text: `${req.body.message} 
Contact number: ${req.body.phone}`,
            });
        } else {
            transporter.sendMail({
                from: `"PR Online Store" ${process.env.USER_ID} `, //support mail
                to: process.env.EMAIL_ID, //company mail
                subject: `Query from ${req.body.email}`,
                text: req.body.message,
            });
        }
        transporter.sendMail({
            from: `"PR Online Store" ${process.env.USER_ID} `, //support mail
            to: req.body.email, //company mail
            subject: `Message Received!`,
            html: `<h3>Thanks for contacting us, We've recevied your query. We will get back to you as soon as possible!</h3>
            <br/>
            <br/>
            <h3>Thanks for choosing PR Online Store. Happy Shopping!</h3>

            <br/>
            <br/>
            <br/>
            

            <div class="default-style"><hr />
            <h3>PR Online Store</h3>
            Thangaraj M G <br />+91 98408 99464<br />No:5/10, 3rd Cross Street,<br />Thirupathi Nagar, Kolathur.<br />Chennai, Tamil Nadu 600099</div>
            
`,
        });

        res.status(200).send("Message Sent!");
    } catch (e) {
        res.status(400).send("Error Occured");
    }
};

const add_cart = async (req, res) => {
    try {
        if (req.body.email && req.body.product_name && req.body.quantity) {
            const cart = await db.Cart.findOne({
                where: {
                    email: req.body.email,
                    product_name: req.body.product_name,
                    status: "in-cart",
                },
            });
            if (cart) {
                const quantity = cart.quantity + req.body.quantity;
                await db.Cart.update(
                    { quantity: quantity },
                    {
                        where: {
                            email: req.body.email,
                            product_name: req.body.product_name,
                        },
                    }
                );
            } else {
                await db.Cart.create({
                    email: req.body.email,
                    product_name: req.body.product_name,
                    quantity: req.body.quantity,
                });
            }
            const total = await db.Cart.findAll({
                where: {
                    email: req.body.email,
                    status: "in-cart",
                },
            });

            let quantity = 0;
            for (let i = 0; i < total.length; i++) {
                quantity += total[i].quantity;
            }

            res.status(200).json({ cart: quantity });
        } else {
            res.status(400).send("Please Login!");
        }
    } catch (e) {
        res.status(500).send("Error Occured");
    }
};

const remove_cart = async (req, res) => {
    await db.Cart.destroy({
        where: {
            email: req.body.email,
            product_name: req.body.product_name,
        },
    });
    const cartproducts = await db.Cart.findAll({
        where: {
            email: req.body.email,
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
        cart: quantity,
        items: cartproducts,
        total: total,
        subtotal: Math.round(subtotal),
        gst: gst,
    });
};

const razor_pay = async (req, res) => {
    try {
        const options = {
            amount: Math.round(req.body.amount) * 100,
            currency: "INR",
            receipt: nanoid(),
            payment_capture: 1,
            notes: req.body.address,
        };

        const response = await razorpay.orders.create(options);
        const address = `Name: ${req.body.address.name}
Contact Number: ${req.body.address.contact_number}
Address: ${req.body.address.address_line_1},
${req.body.address.address_line_2}.
City: ${req.body.address.city}
Zip: ${req.body.address.zip}
Country: ${req.body.address.country}`;

        await db.Cart.update(
            {
                order_id: response.id,
                shipping_address: address,
            },
            {
                where: {
                    email: req.body.email,
                    status: "in-cart",
                },
            }
        );
        res.status(200).json({
            id: response.id,
            currency: response.currency,
            amount: response.amount,
        });
    } catch (e) {
        res.status(400).send("Error Occured");
    }
};

const verification = async (req, res) => {
    try {
        const secret = process.env.VERIFICATION_SECRET;

        const crypto = require("crypto");

        const shasum = crypto.createHmac("sha256", secret);
        shasum.update(JSON.stringify(req.body));
        const digest = shasum.digest("hex");

        if (digest === req.headers["x-razorpay-signature"]) {
            const cart_items = await db.Cart.findAll({
                where: {
                    order_id: req.body.payload.payment.entity.order_id,
                    status: "in-cart",
                },
                include: [db.Product],
            });
            const line_items = [];
            let total = 0;
            for (let i = 0; i < cart_items.length; i++) {
                let price = parseInt(
                    cart_items[i].Product.price.replace(",", "")
                );
                total = Math.round(price - price * (25 / 100));

                let line_item = {
                    description: cart_items[i].product_name,
                    price: total,
                    quantity: cart_items[i].quantity,
                    tax: 18,
                };
                line_items.push(line_item);
            }

            let invoice_number = await db.Cart.aggregate(
                "order_id",
                "DISTINCT",
                {
                    plain: false,
                }
            );

            invoice_number = invoice_number.length.toLocaleString("en-US", {
                minimumIntegerDigits: 4,
                useGrouping: false,
            });

            const OrderId = orderid.generate();

            var data = {
                documentTitle:
                    "<b>Tax Invoice/Bill of Supply</b> <br/> (Original for Recipient)", //Defaults to INVOICE
                //"locale": "de-DE", //Defaults to en-US, used for number formatting (see docs)
                currency: "INR", //See documentation 'Locales and Currency' for more info
                taxNotation: "gst", //or gst
                marginTop: 25,
                marginRight: 25,
                marginLeft: 25,
                marginBottom: 25,
                logo: logo_base, //or base64
                sender: {
                    company: "PR Online Store",
                    address: `No:5/10, 3rd Cross Street,
                    Thirupathi Nagar, Kolathur.`,
                    zip: "600 099",
                    city: "Chennai",
                    country: "India",
                },
                client: {
                    company: req.body.payload.payment.entity.notes.name,
                    address: `${req.body.payload.payment.entity.notes.address_line_1} ${req.body.payload.payment.entity.notes.address_line_2}`,
                    zip: req.body.payload.payment.entity.notes.zip,
                    city: req.body.payload.payment.entity.notes.city,
                    country: req.body.payload.payment.entity.notes.country,
                    contactnumber:
                        req.body.payload.payment.entity.notes.contact_number,
                },
                invoiceNumber: `INV_${invoice_number}`,
                invoiceDate: moment().format("DD-MM-YYYY"),
                products: line_items,
                bottomNotice: "Thanks for shopping with us.",
            };
            await db.Cart.update(
                {
                    status: "paid",
                    payment_id: req.body.payload.payment.entity.id,
                    order_id: OrderId,
                    invoice_id: `INV_${invoice_number}`,
                    purchased_date: moment().format("LL"),
                },
                {
                    where: {
                        order_id: req.body.payload.payment.entity.order_id,
                        status: "in-cart",
                    },
                }
            );
            easyinvoice.createInvoice(data, async (result) => {
                transporter.sendMail({
                    from: `"PR Online Store" ${process.env.USER_ID}`,
                    to: req.body.payload.payment.entity.email,
                    subject: "PR Online Store Invoice",

                    html: `<h3>Thanks for shopping with us, your order has been received.<h3>
<h4>Your Order ID: <b>${OrderId}</b><h4>
<br />
<br />
<h3>Happy Shopping!</h3>

<br />
<br />
<br />

<div class="default-style"><hr />
<h3>PR Online Store</h3>
Thangaraj M G<br />+91 98408 99464<br />No:5/10, 3rd Cross Street,<br />Thirupathi Nagar, Kolathur.<br />Chennai, Tamil Nadu 600099</div>

`,

                    attachments: [
                        {
                            filename: "Invoice.pdf",
                            content: result.pdf,
                            encoding: "base64",
                        },
                    ],
                });

                transporter.sendMail({
                    from: `"#Order Received" ${process.env.USER_ID}`,
                    to: process.env.EMAIL_ID,
                    subject: "You have received an Order!",

                    html: `
                    <h3>Order ID: <b>${OrderId}</b></h3>
                    <h4>Please refer the invoice attached below to know the order details!</h4>
                    `,

                    attachments: [
                        {
                            filename: "Invoice.pdf",
                            content: result.pdf,
                            encoding: "base64",
                        },
                    ],
                });
            });
        } else {
            this.status(500).send("Error Occured!");
        }
        res.json({ status: "ok" });
    } catch (error) {
        res.status(500).send("Error Occured!");
    }
};

const update_user_password = async (req, res) => {
    try {
        if (req.body.password) {
            const password = await bcrypt.hash(req.body.password, saltRounds);

            await db.User.update(
                {
                    password: password,
                },
                {
                    where: {
                        email: req.body.email,
                    },
                }
            );
            const user = await db.User.findByPk(req.body.email);

            req.session.reset_token = null;
            res.status(200).json({ role: user.role });
        } else {
            res.status(400).send("Error Occured!");
        }
    } catch (e) {
        res.status(500).send("Error Occured!");
    }
};

const deliver = async (req, res) => {
    try {
        await db.Cart.update(
            {
                delivered: 1,
            },
            {
                where: {
                    product_name: req.body.product_name,
                    order_id: req.body.order_id,
                },
            }
        );

        res.status(200).send("ok");
    } catch (e) {
        res.status(400).send("Error Occured");
    }
};

const add_product = async (req, res) => {
    try {
        const product = await db.Product.findOne({
            where: { name: req.body.name },
        });
        if (!product) {
            await db.Product.create(req.body);

            res.status(200).send("created");
        } else {
            res.status(400).send("Product already exists");
        }
    } catch (e) {
        res.status(400).send("Error occured, please try again!");
    }
};

const update_price = async (req, res) => {
    try {
        await db.Product.update(
            { price: req.body.price },
            {
                where: {
                    name: req.body.name,
                },
            }
        );

        const updated_products = await db.Product.findAll({
            order: [["category", "ASC"]],
        });

        res.status(200).send(updated_products);
    } catch (error) {
        res.status(400).send("Error occured, please try again!");
    }
};

module.exports = {
    login,
    register,
    message,
    add_cart,
    razor_pay,
    remove_cart,
    verification,
    update_user_password,
    adminLogin,
    deliver,
    add_product,
    update_price,
};
