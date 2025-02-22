module.exports = async (e = "", t = "") => {
    // ตรวจสอบหมายเลขโทรศัพท์
    e = (e + "").trim();
    if (!e.length || e.match(/\D/)) {
        throw Error("INVAILD_PHONE");
    }

    // แยกรหัสบัตรกำนัลจาก URL หรือค่าที่ได้รับมา
    t = (t + "");
    let r = t.split("v=");
    t = (r[1] || r[0]).match(/[0-9A-Za-z]+/)[0];

    // ตรวจสอบความยาวของรหัสบัตรกำนัล (ต้องมี 35 ตัวอักษร)
    if (t.length !== 35) {
        throw Error("INVAILD_VOUCHER");
    }

    // เรียก API เพื่อแลกบัตรกำนัล
    let o = await fetch(`https://gift.truemoney.com/campaign/vouchers/${t}/redeem`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mobile: e, voucher_hash: t })
    }).then(res => res.json());

    // ตรวจสอบผลลัพธ์จาก API
    if (o.status.code === "SUCCESS") {
        return {
            amount: Number(o.data.my_ticket.amount_baht.replace(/,/g, '')),
            owner_full_name: o.data.owner_profile.full_name,
            code: t
        };
    }
    throw Error(o.status.code);
};
