export default {
  providers: [
    {
      // Your Convex site URL is provided in a system
      // environment variable
      domain: process.env.VITE_CONVEX_SITE_URL,

      // Application ID has to be "convex"
      applicationID: "convex",
    },
  ],
}
