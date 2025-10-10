const express = require("express");
const app = express();
const fs = require("fs");
const cors = require("cors");
const multer = require("multer");

// Import API services
const { postReelToFacebook } = require("./postServices/facebookApiService.js");
const {
  postReelToInstagram,
} = require("./postServices/instagramApiService.js");
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

/*
 *  POST to Generate Docx
 */

const rootDir =
  process.env.NODE_ENV === "development"
    ? "/Users/kjannette/workspace8/testStoraage"
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

// Serve video files statically for API testing
app.use("/video_files", express.static("video_files"));

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
 *  POST store new reel data
 */

app.post("/v1/store-reel-data/:reelId", function (req, res) {
  const { reelId } = req.params;
  const data = req.body;
  try {
    //storeReelData(docId, data);
    console.log("data received by backed:  ", data);
  } catch (err) {
    console.log("Error at /v1/store-edited-completions:", err);
  }
  res.end();
});

/*
 *  POST test Facebook reel upload
 */
app.post("/test/facebook-reel", async function (req, res) {
  console.log("Testing Facebook reel upload...");
  const { videoFileName, reelName, reelDescription } = req.body;

  try {
    // Construct the public URL for the video file
    const baseUrl = `https://www.midnightsoldiers.com:${port}`;
    const videoUrl = `${baseUrl}/video_files/${videoFileName}`;

    // Get file size
    const filePath = `./video_files/${videoFileName}`;
    const stats = fs.statSync(filePath);
    const fileSizeInMB = stats.size / (1024 * 1024);

    const reelData = {
      reelVideoUrl: videoUrl,
      reelSize: fileSizeInMB,
      reelName: reelName || "Test Reel",
      reelDescription:
        reelDescription || "Test upload - will delete soon! #test",
    };

    console.log("Uploading to Facebook with data:", reelData);
    const result = await postReelToFacebook(reelData);

    res.json({
      success: true,
      platform: "Facebook",
      result: result,
    });
  } catch (error) {
    console.error("Facebook upload test failed:", error);
    res.status(500).json({
      success: false,
      platform: "Facebook",
      error: error.message,
    });
  }
});

/*
 *  POST test Instagram reel upload
 */
app.post("/test/instagram-reel", async function (req, res) {
  console.log("Testing Instagram reel upload...");
  const { videoFileName, reelName, reelDescription } = req.body;

  try {
    // Construct the public URL for the video file
    const baseUrl = `https://www.midnightsoldiers.com:${port}`;
    const videoUrl = `${baseUrl}/video_files/${videoFileName}`;

    // Get file size
    const filePath = `./video_files/${videoFileName}`;
    const stats = fs.statSync(filePath);
    const fileSizeInMB = stats.size / (1024 * 1024);

    const reelData = {
      reelVideoUrl: videoUrl,
      reelSize: fileSizeInMB,
      reelName: reelName || "Test Reel",
      reelDescription:
        reelDescription || "Test upload - will delete soon! #test",
    };

    console.log("Uploading to Instagram with data:", reelData);
    const result = await postReelToInstagram(reelData);

    res.json({
      success: true,
      platform: "Instagram",
      result: result,
    });
  } catch (error) {
    console.error("Instagram upload test failed:", error);
    res.status(500).json({
      success: false,
      platform: "Instagram",
      error: error.message,
    });
  }
});

/*
 *  PUT route to post reel to both Facebook and Instagram
 */
app.put("/api/post-to-social/:reelId", async function (req, res) {
  console.log("POST TO SOCIAL MEDIA ENDPOINT CALLED");
  const { reelId } = req.params;
  const { reelName, reelDescription, reelVideoUrl, reelSize } = req.body;

  console.log("Reel ID:", reelId);
  console.log("Reel data received:", req.body);

  try {
    // Validate required fields
    if (!reelVideoUrl) {
      return res.status(400).json({
        success: false,
        error: "reelVideoUrl is required",
        reelId,
      });
    }

    // Validate URL format (must be HTTPS for social media APIs)
    try {
      const url = new URL(reelVideoUrl);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        return res.status(400).json({
          success: false,
          error: "reelVideoUrl must be a valid HTTP/HTTPS URL",
          reelId,
        });
      }
    } catch (urlError) {
      return res.status(400).json({
        success: false,
        error: "reelVideoUrl is not a valid URL",
        reelId,
      });
    }

    // Validate file size
    if (!reelSize || typeof reelSize !== "number" || reelSize <= 0) {
      return res.status(400).json({
        success: false,
        error: "reelSize must be a positive number (in MB)",
        reelId,
      });
    }

    // Check file size limits
    // Facebook: 4GB max (4096 MB)
    // Instagram: 100MB recommended, 1GB max (1024 MB)
    const maxSizeMB = 1024; // Use Instagram's limit as it's more restrictive
    if (reelSize > maxSizeMB) {
      return res.status(400).json({
        success: false,
        error: `File size (${reelSize}MB) exceeds maximum allowed size (${maxSizeMB}MB for Instagram)`,
        reelId,
      });
    }

    // Warn if size is large (over 100MB)
    if (reelSize > 100) {
      console.warn(
        `Warning: File size (${reelSize}MB) exceeds Instagram's recommended size (100MB)`
      );
    }

    const reelData = {
      reelVideoUrl,
      reelSize,
      reelName: reelName || "Untitled Reel",
      reelDescription: reelDescription || "Posted from Midnight Soldiers",
    };

    console.log("Prepared reel data for APIs:", reelData);

    // Post to Facebook and Instagram in parallel
    const [facebookResult, instagramResult] = await Promise.allSettled([
      postReelToFacebook(reelData),
      postReelToInstagram(reelData),
    ]);

    // Process results
    const results = {
      reelId,
      facebook: {
        success: facebookResult.status === "fulfilled",
        data:
          facebookResult.status === "fulfilled" ? facebookResult.value : null,
        error:
          facebookResult.status === "rejected"
            ? facebookResult.reason.message
            : null,
      },
      instagram: {
        success: instagramResult.status === "fulfilled",
        data:
          instagramResult.status === "fulfilled" ? instagramResult.value : null,
        error:
          instagramResult.status === "rejected"
            ? instagramResult.reason.message
            : null,
      },
    };

    console.log("Social media posting results:", results);

    // Return success if at least one platform succeeded
    const overallSuccess =
      results.facebook.success || results.instagram.success;

    res.json({
      success: overallSuccess,
      message: overallSuccess
        ? "Reel posted to social media"
        : "Failed to post to any platform",
      results: results,
    });
  } catch (error) {
    console.error("Error in post-to-social endpoint:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      reelId,
    });
  }
});

console.log("app running on port", port);
console.log("rootDir", rootDir);

app.listen(port);
