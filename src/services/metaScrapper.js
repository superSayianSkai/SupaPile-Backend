import * as Cheerio from "cheerio";
import axios from "axios";
export const metaScrapper = async (req, res) => {
  try {
    console.log("trying to fetch.....")
    const { url } = req.query;
    const decodedUrl = decodeURIComponent(url);
    const response = await axios.get(decodedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    const $ = Cheerio.load(response.data);

    const title = $("head title").text();
    const description = $('meta[name="description"]').attr("content");
    const image = $('meta[property="og:image"]').attr("content");
    const result = { title, description, image };
    console.log(result)
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return new Error("failed to fetchMeta data");
  }
};
