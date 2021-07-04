module.exports = (sequelize, DataTypes) => {
    const Cart = sequelize.define("Cart", {
        quantity: { type: DataTypes.INTEGER(45), defaultValue: 1 },
        status: {
            type: DataTypes.STRING(45),
            defaultValue: "in-cart",
        },
        order_id: {
            type: DataTypes.STRING(200),
        },
        payment_id: {
            type: DataTypes.STRING(200),
        },
        shipping_address: {
            type: DataTypes.STRING(200),
        },
        purchased_date: {
            type: DataTypes.STRING(45),
        },
        invoice_id: {
            type: DataTypes.STRING(45),
        },

        delivered: {
            type: DataTypes.BOOLEAN,
            defaultValue: 0,
        },
    });

    return Cart;
};
