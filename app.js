const express = require("express");
const app = express();
const fs = require("fs");
const cors = require("cors");
const multer = require("multer");
//const { db } = require("./firebase/firebase.js");
//const crypto = require("crypto");

const { collection, query, where, getDocs } = require("firebase/firestore");

const generatePassword = (
  length = 20,
  characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~!@-#$"
) =>
  Array.from(crypto.randomFillSync(new Uint32Array(length)))
    .map((x) => characters[x % characters.length])
    .join("");

//*** STRIPE ***/

/*
const Stripe = require("stripe");
const { stripeAPIKey, stripeWebhooksKey } = require("./firebase/secrets.js");
const stripe = Stripe(stripeAPIKey);
// Secret for Stripe webhooks
const endpointSecret = stripeWebhooksKey;
const httpProxy = require("http-proxy");
const targetUrl = "http://127.0.0.1:8081";
const proxy = httpProxy.createProxy({
  changeOrigin: true,
  target: targetUrl,
});
*/

//*** MULTER ***/
const storage = multer.diskStorage({
  destination: "./Documents/Uploads",
  filename: function (req, file, callback) {
    callback(null, file.originalname);
  },
});

const altStorage = multer.diskStorage({
  destination: "./Documents/Complaints",
  filename: function (req, file, callback) {
    callback(null, file.originalname);
  },
});

const upload = multer({ storage: storage });
const uploadComp = multer({ storage: altStorage });

//POST NEW COMPLAINT DOC -> py docConvert pdf-png
app.post(
  "/v1/parse-new-compdoc",
  uploadComp.single("file"),
  function (req, res) {
    const id = req.file.originalname.split(".")[0];
    const isComplaint = true;
    const clientPosition = "plaintiff";
    try {
      req.url = req.url.replace(
        "/v1/parse-new-compdoc",
        `/parse-new-complaint/${id}`
      );
      proxy.web(req, res, {
        function(err) {
          console.log("Proxy error:", err);
        },
      });
    } catch (err) {
      console.log("Error at /v1/gen-disc-request", err);
      res.send(err);
    }
    res.sendStatus(200);
  }
);

/*
 *  POST new discv request => docConvert - for pdf to png
 */

app.post("/v1/parse-new-req-doc", upload.single("file"), function (req, res) {
  const id = req.file.originalname.split(".")[0];

  try {
    req.url = req.url.replace(
      "/v1/parse-new-req-doc",
      `/parse-new-disc-req/${id}`
    );
    proxy.web(req, res, {
      function(err) {
        console.log("Proxy error:", err);
      },
    });
  } catch (err) {
    logger.error({ level: "error", message: "err", err });
    console.log("Error at /v1/gen-disc-request", err);
    res.send(err);
  }

  res.sendStatus(200);
});

//Make outgoing requests from complaint
app.post(
  "/v1/generate-outgoing-disc-req/:docId/:clientPosition",
  async (req, res) => {
    const { docId, clientPosition } = req.params;

    const isComplaint = true;
    try {
      const res = await tesseController.executeReadWriteActions(
        docId,
        isComplaint,
        clientPosition
      );
      //return res;
    } catch (err) {
      console.log("err in make-outgoing-requests", err);
    }
    res.sendStatus(200);
  }
);

//make resp to incoming requests from req doc
app.post(
  "/v1/generate-disc-responses/:docId/:clientPosition",
  async (req, res) => {
    const { docId, clientPosition } = req.params;
    console.log(
      "hit endpoint /v1/generate-disc-responses and this is docId:",
      docId
    );
    const isComplaint = false;
    try {
      const res = await tesseController.executeReadWriteActions(
        docId,
        isComplaint,
        clientPosition
      );
      return res;
    } catch (err) {
      console.log("err in make-outgoing-requests", err);
    }
    res.sendStatus(200);
  }
);

/*
 *  POST to Generate Docx
 */

app.post("/v1/generate-request-docx/:docId", async function (req, res) {
  const { docId } = req.params;
  const data = req.body;
  try {
    req.url = req.url.replace("/v1/generate-request-docx", `/gen-req-docx`);
    proxyTwo.web(req, res, {
      function(err) {
        console.log("Proxy error:", err);
      },
    });
  } catch (err) {
    console.log("generate-request-docx error", err);
  }
});

const rootDir =
  process.env.NODE_ENV === "development"
    ? "/Users/kjannette/workspace/ax3"
    : "/var/www";

//*** EXPRESS ***/

const port = 3200;

var corsOptions = {
  AccessControlAllowOrigin: "*",
  origin: "*",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

/*
 *  Client POST create stripe subscription, make payment
 */

app.post("/create-subscription", async (req, res) => {
  const { planType, additionalAccounts, isAnnual, customerData, token } =
    req.body;
  try {
    const sub = await stripeController.createNewSubscription(
      planType,
      additionalAccounts,
      isAnnual,
      customerData,
      token
    );

    const subscriptionCreated = sub.subscription.created;
    const subscriptionPeriodStart = sub.subscription.current_period_start;
    const subscriptionPeriodEnd = sub.subscription.current_period_end;
    const subscriptionId = sub.subscription.id;
    const customerId = sub.customer.customerId;

    res.send({
      subscriptionCreated,
      subscriptionPeriodStart,
      subscriptionPeriodEnd,
      subscriptionId,
      customerId,
    });
  } catch (error) {
    console.log("Error in create-subscription", error);
    res.status(400).send({ error: { message: error.message } });
  }
});

/*
 *  Client POST create stripe subscription, make payment
 */
console.log("process.env.NODE_ENV", process.env.NODE_ENV);
app.post("/new-payment-intent", async (req, res) => {
  const { planType, additionalAccounts, isAnnual, customerData, token } =
    req.body;

  const userAgent = req.headers["user-agent"];
  try {
    const payIntent = await stripeController.createNewPaymentIntent(
      customerData,
      token,
      userAgent
    );
    res.send({
      payIntent,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send({ error: { message: error.message } });
  }
});

/*
 *  Client POST for cancelling a subscription
 */

app.post("/cancel-subscription", async (req, res) => {
  const { appUserId } = req.body;
  try {
    //const usersRef = collection(db, "users");
    //const q = query(usersRef, where("appUserId", "==", appUserId));
    //const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log("No user found with the email:", appUserId);
      return;
    }

    const userDoc = querySnapshot.docs[0];
    //get the user's subscription ID and customer ID
    const subscriptionId = userDoc.data().subscriptionId;
    const deletedSubscription = await stripe.subscriptions.update(
      subscriptionId,
      {
        cancel_at_period_end: true,
      }
    );

    res.status(200).send();
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: { message: error.message } });
  }
});

/*
 *  Client POST - Stripe webhook(s)
 */

app.post(
  "/stripe-webhook",
  express.raw({ type: "application/json" }),
  async (request, response) => {
    const { type } = request.body.type;
    switch (request.body.type) {
      case "customer.subscription.deleted":
        const subscription = request.body.data.object;

        //get stripe customer
        const stripeCustomer = await stripe.customers.retrieve(
          subscription.customer
        );

        await handleSubscriptionDeletion(stripeCustomer, subscription, stripe);
        break;
        x;
      case "invoice.payment_failed":
        const paymentIntent = request.body.data.object;
        await handlePaymentFailure(paymentIntent);
        break;
      default:
        console.log(`Unhandled event type`);
    }
    response.status(200).send();
  }
);

/*
 *  Generate responses to irregular types
 *  combined-numbered
 */

app.get(
  "/v1/generate-disc-responses-irreg/:docId/:docType/:isRequests",
  async (req, res) => {
    const { docId, docType } = req.params;
    const isRequests = false;

    try {
      const data = await modelController.arrayGenAnswers(
        docId,
        docType,
        isRequests
      );
      res.send(data);
    } catch (error) {
      console.log(error);
    }
  }
);

/*
 *
 *  GET .docx discovery response
 *
 */

app.get("/v1/get-docx/:docId/:reqType", (req, res) => {
  const { docId } = req.params;
  res.sendFile(`${docId}.docx`, {
    root: `${rootDir}/ax3Services/Docxfinal/`,
  });
});

/*
 *  Cleanup docx working files (temp workaround)
 */

app.get("/cleanUpDocx/:docId/:reqType", (req, res) => {
  const { docId, reqType } = req.params;
  try {
    cleanupGenFolderAndContents(docId, reqType);
    res.end("doc cleanup complete");
  } catch (err) {
    console.log(err);
  }
});

/*
 *  POST store user-edited completions
 */

app.post("/v1/store-edited-completions", function (req, res) {
  const data = req.body;

  try {
    storeEditedCompletions(data);
  } catch (err) {
    console.log("Error at /v1/store-edited-completions:", err);
  }
  res.end();
});

/*
 *  POST store reel data
 */

app.post("/v1/store-reel-data/:reelId", function (req, res) {
  const { docId } = req.params;
  const data = req.body;
  console.log("data", data);
  try {
    //storeReelData(docId, data);
  } catch (err) {
    console.log("Error at /v1/store-edited-completions:", err);
  }
  res.end();
});

/*
 *
 *  Client GET parsed requests array
 */

app.get("/v1/get-parsed-requests/:docId/:docType", (req, res) => {
  const { docId, docType } = req.params;
  try {
    res.sendFile(`${docId}-jbk-parsedRequests.json`, {
      root: `${rootDir}/ax3Services/Documents/Requests/${docType}/${docId}/`,
    });
  } catch (err) {
    console.log("err", err);
  }
});

/*
 *  Client GET completions - requests outgoing
 */

console.log("app running on port", port);
console.log("rootDir", rootDir);

app.listen(port);
