const express = require("express");
const mongoose = require("mongoose")
const bodyParser = require("body-parser");
const date = require(__dirname + "/date.js");
var nodemailer = require('nodemailer');

mongoose.connect('mongodb://localhost:27017/invoiceDB');
const app = express();

// Line Items schema
const lineItemSchema = {
  itemName: String,
  material: String,
  quantity: Number,
  price: Number,
  hoursOfWork: {
    type: Number,
    default: 0
  },
  ratePerHour: {
    type: Number,
    default: 0
  },
  labourCost: {
    type: Number,
    default: function() {
      return (this.hoursOfWork * this.ratePerHour);
    }
  }, //labour Cost = hoursOfWork * ratePerHour
  total: {
    type: Number,
    default: function() {
      let totalProductPrice = this.quantity * this.price;
      totalProductPrice += this.labourCost;
      return totalProductPrice;
    }
  }
};

const noteSchema = {
  modeOfPayment: {
    type: "String",
    default: "Cash"
  },
  sendChecksAtAddress: {
    type: "String",
    default: "ABC Company, X street, Y city, PIN - 000000",
  }
};

const invoiceSchema = {
  date: {
    type: String,
    default: date.getDate()
  },
  notes: [noteSchema],
  dueDate: {
    type: String,
    default: date.getDueDate()
  },
  lineItems: [lineItemSchema],
  grandTotal: {
    type: Number,
    default: function() {
      let total = 0
      this.lineItems.forEach((item) => {
        total += item.total;
      });
      return total;
    }
  },
  status: {
    type: String,
    default: "unpaid"
  },
}

const LineItem = mongoose.model("LineItem", lineItemSchema);
const Note = mongoose.model("Note", noteSchema);
const Invoice = mongoose.model("Invoice", invoiceSchema);



app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(express.static("public"));

app.get("/", function(req, res) {
  let day = date.getDate();
  LineItem.find({}, function(err, LineItems) {
    Note.find({}, function(err, Note) {
      if (err) {
        console.log(err);
      }
      console.log(Note);
      res.render("list", {
        listTitle: day,
        newListItems: LineItems,
      });
    });
  });
});

app.post("/", function(req, res) {
  let itemName = req.body.itemName;
  let material = req.body.material;
  let quantity = req.body.quantity;
  let price = req.body.price;
  let hoursOfWork = req.body.hoursOfWork;
  let ratePerHour = req.body.ratePerHour;
  if (itemName) {
    const newItem = new LineItem({
      itemName: itemName,
      material: material,
      quantity: quantity,
      price: price,
      hoursOfWork: hoursOfWork,
      ratePerHour: ratePerHour
    });
    newItem.save();
  }
  res.redirect("/");
});

app.post("/createInvoice", function(req, res) {
  let sendChecksAtAddress = req.body.sendChecksAtAddress;
  let modeOfPayment = req.body.modeOfPayment;
  console.log(sendChecksAtAddress);
  console.log(modeOfPayment);

  if (sendChecksAtAddress || modeOfPayment) {
    Note.deleteMany({}, function(err) {
      if (err) {
        console.log(err);
      }
    });
    const newNote = new Note({
      sendChecksAtAddress: sendChecksAtAddress,
      modeOfPayment: modeOfPayment
    });
    Note.findOneAndUpdate({}, newNote, {
      new: true
    });
    newNote.save();
  } else {
    Note.find({}, function(err, Notes) {
      if (err) {
        console.log(err);
      } else {
        if (Notes.length === 0) {
          const defaultNote = new Note();
          defaultNote.save();
        }
      }
    });
  }
  LineItem.find({}, function(err, LineItems) {
    Note.find({}, function(err, Notes) {
      if (err) {
        console.log(err);
      }
      newInvoice = new Invoice({
        notes: Notes,
        lineItems: LineItems,
      });
      newInvoice.save();
      res.render(
        "invoice", {
          invoiceDetails: newInvoice
        });
      console.log(newInvoice);
      LineItem.deleteMany({}, function(err) {
        if (err) {
          console.log(err);
        } else {
          console.log("Deleted all from Line Items")
        }
      });
    });
  });
});

app.post("/viewInvoice", function(req, res) {
  invoiceID = req.body.viewInvoiceById;
  Invoice.findById(invoiceID, function(err, Invoice) {
    if (err) {
      console.log(err);
    } else {
      res.render(
        "invoice", {
          invoiceDetails: Invoice
        });
    };
  });
});

app.post("/updateStatus", function(req, res) {
  const invoiceID = req.body.updateStatusById;
  const selectedStatus = req.body.updateStatusTo;

  Invoice.findByIdAndUpdate(invoiceID, {
    status: selectedStatus
  }, function(err, Invoice) {
    if (err) {
      console.log(err);
    } else {
      console.log("Updated");
      res.redirect("/invoices");
    }
  });
});

app.post("/emailInvoice", function(req, res) {
  const invoiceID = req.body.emailInvoiceById;
  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'emaildummy262@gmail.com',
      pass: '@1234ABCD'
    }
  });

  Invoice.findById(invoiceID, function(err, Invoice) {
    if (err) {
      console.log(err);
    } else {
      console.log(Invoice);
      var mailOptions = {
        from: 'emaildummy262@gmail.com',
        to: 'jhamonika711@gmail.com',
        subject: 'Invoice by invoice app',
        text: JSON.stringify(Invoice)
      };
      console.log(mailOptions.text);
      transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log('Email sent: ' + info.response);
          res.redirect("/invoices");
        }
      });
    }
  });
});

app.post("/updateStatus", function(req, res) {
  const invoiceID = req.body.updateStatusById;
  const selectedStatus = req.body.updateStatusTo;

  Invoice.findByIdAndUpdate(invoiceID, {
    status: selectedStatus
  }, function(err, Invoice) {
    if (err) {
      console.log(err);
    } else {
      console.log("Updated");
      res.redirect("/invoices");
    }
  });
});

app.get("/invoices", function(req, res) {
  status = ["Unpaid", "Outstanding", "Late", "Paid"];
  Invoice.find({}, function(err, Invoices) {
    if (err) {
      console.log(err);
    } else {
      res.render("allInvoices", {
        displayInvoices: Invoices,
        status: status,
      });
    };
  });
});


app.listen(3000, function() {
  console.log("Server running at port 3000");
});