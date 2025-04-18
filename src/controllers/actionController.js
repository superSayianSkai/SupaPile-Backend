import mongoose from "mongoose";
import Links from "../models/actionModel.js";
import { randomUUID } from "crypto";
import { generateMeta } from "../utilities/generateMeta.js";
import { io } from "../../index.js";
export const postPile = async (req, res) => {
  try {
    let piles = req.body;
    const { id } = req.user;
    if (!Array.isArray(piles)) {
      piles = [piles];
    }
    let URLsToCheck = piles.map((pile) => pile.url);
    const existingPile = await Links.find({
      userId: id,
      url: { $in: URLsToCheck },
    });
    const existingURLs = existingPile.map((pile) => pile.url);
    const nonExistingURLs = await URLsToCheck.filter(
      (url) => !existingURLs.includes(url)
    );

    const pilesToSend = piles.filter((pile) =>
      nonExistingURLs.includes(pile.url)
    );

    const formatedNonExistingURLs = pilesToSend.map((pileToSend) => ({
      userId: id,
      ...pileToSend,
    }));
    console.log(formatedNonExistingURLs);

    await Links.insertMany(formatedNonExistingURLs);

    if (existingURLs.length && formatedNonExistingURLs.length) {
      return res.status(200).send({
        success: true,
        message:
          `saved: ` +
          "but pile with with this URL not saved already exist: " +
          existingURLs,
      });
    }
    if (existingURLs.length) {
      return res.status(409).send({
        success: true,
        message: `${
          existingURLs.length > 1 ? "piles already exist" : "pile exists"
        }`,
      });
    }

    return res.status(200).send({
      success: true,
      message: `${
        formatedNonExistingURLs.length > 1 ? "piles saved" : "pile saved"
      }`,
    });
  } catch (error) {
    console.log(error);
  }
};

export const readPile = async (req, res) => {
  const { id } = req.user;
  const { category = "all" } = req.params;
  let { lastId } = req.query;
  let limit = 48;
  // console.log(id);
  try {
    let piles;
    let query = { userId: id, isDeleted: false };
    if (category != "all") query.category = category;

    piles = await Links.find(query)
      .select(["_id", "url", "image", "title", "description", "visibility"])
      .sort({ _id: 1 })
      .limit(limit)
      .lean();
    // console.log(piles);
    const results = piles.map((pile) => ({ id: pile._id, url: pile.url }));
    // console.log(results);

    const notExistingMeta = await Links.find({
      userId: id,
      // image: "",
      title: "",
      description: "",
    });
    console.log(notExistingMeta);
    const retrievedMeta = async (results) => {
      try {
        const metaResults = await Promise.all(
          results.map((result) => generateMeta(result))
        );
        console.log("jsjsjsj");
        console.log(metaResults);

        console.log("passed");
        const updates = await Promise.all(
          metaResults.map(async (metaResult) => {
            // Await the updateMany operation her

            const updateResult = await Links.updateOne(
              { userId: id, _id: metaResult.id },
              {
                $set: {
                  image: metaResult.image,
                  title: metaResult.title,
                  description: metaResult.description,
                },
              }
            );

            console.log("this is the");
            console.log(updateResult);
            if (updateResult.modifiedCount > 0) {
              io.emit("metaUpdate", {
                id: metaResult.id,
                image: metaResult.image,
                title: metaResult.title,
                description: metaResult.description,
              });
            }
            return updateResult;
          })
        );

        // console.log("All updates done:", updates);
      } catch (error) {
        console.log("Error during retrieval or update:", error);
      }
    };

    retrievedMeta(notExistingMeta);

    // console.log("should print first");
    if (!piles || piles.length <= 0) {
      return res.json({ message: "category doesn't exist" });
    }
    return res.status(200).json({ success: true, data: piles });
  } catch (error) {
    console.log(error);
  }
};

export const softDeletePile = async (req, res) => {
  try {
    const { id } = req.user;
    let [{ _id }] = req.body;
    if (!_id) {
      return res
        .status(400)
        .json({ message: "Ivalid Request, Id is required" });
    }
    let linkId = _id;
    if (!Array.isArray(linkId)) {
      linkId = [linkId];
    }
    const objectId = linkId.map((link) => {
      return new mongoose.Types.ObjectId(link);
    });
    const isDeletedCheck = await Links.find({ userId: id, _id: objectId })
      .select(["isDeleted"])
      .lean();
    console.log(isDeletedCheck[0].isDeleted);
    if (isDeletedCheck[0].isDeleted) {
      return res.json({ message: "link already archievd" });
    }
    const updateResult = await Links.updateMany(
      { _id: { $in: objectId } },
      { $set: { isDeleted: true } }
    );

    if (!updateResult) {
      return res.status(403).json({ message: "failed to archive" });
    }
    return res
      .status(200)
      .json({ message: `${updateResult.modifiedCount} links archived` });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "an error has occurred" });
  }
};

export const archivedPile = async (req, res) => {
  try {
    const { id } = req.user;
    const archievdPiles = await Links.find({
      userId: id,
      isDeleted: true,
    })
      .select(["id", "url", "title", "description"])
      .lean();
    return res
      .status(200)
      .json({ success: true, message: "archievedPiles", data: archievdPiles });
  } catch (error) {
    console.log(error);
    return res.staus(500).json({ message: "an error occured" });
  }
};

export const generatePublicLink = async (req, res) => {
  try {
    const { id } = req.user;
    console.log(id);
    const randomuuID = randomUUID();
    console.log(randomuuID);
    const result = await Links.updateMany(
      { userId: id, visibility: "public" },
      { $set: { publicLink: randomuuID } }
    );
    //i have to replace with an actual domain
    const link = `http://localhost:5223/api/share/${randomuuID}`;
    console.log(result);
    return res.status(200).json({ success: true, data: link });
  } catch (error) {
    console.log(error);
  }
};

export const userPublicList = async (req, res) => {
  try {
    const { uuID } = req.params;
    console.log(uuID);
    const result = await Links.find({ publicLink: uuID, visibility: "public" })
      .select(["url", "title", "description", "-_id"])
      .lean();
    console.log(result);
    if (!result || result.length <= 0) {
      return res.status(404).json({ message: "404 not found" });
    }
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.log(error);
  }
};

export const restorePile = async (req, res) => {
  try {
    const { id } = req.user;
    let [{ _id }] = req.body;
    if (!_id) {
      return res
        .status(400)
        .json({ message: "Ivalid Request, Id is required" });
    }
    let linkId = _id;
    if (!Array.isArray(linkId)) {
      linkId = [linkId];
    }
    const objectId = linkId.map((link) => {
      return new mongoose.Types.ObjectId(link);
    });
    const result = await Links.updateMany(
      {
        userId: id,
        _id: _id,
        isDeleted: true,
      },
      { $set: { isDeleted: false } }
    );
    console.log(result);
    if (!result || result.modifiedCount <= 0) {
      return res.status(500).json({ message: "not restored" });
    }
    return res.status(200).json({ success: true, message: "pile restored" });
  } catch (error) {
    console.log(error);
  }
};

export const hardDeletePile = async (req, res) => {
  try {
    const { id } = req.user;
    let [{ _id }] = req.body;
    if (!_id) {
      return res
        .status(400)
        .json({ message: "Ivalid Request, Id is required" });
    }
    let linkId = _id;
    if (!Array.isArray(linkId)) {
      linkId = [linkId];
    }
    const objectId = linkId.map((link) => {
      return new mongoose.Types.ObjectId(link);
    });
    const result = await Links.deleteMany({
      userId: id,
      _id: _id,
      isDeleted: true,
    });
    if (!result || result.deletedCount <= 0) {
      return res.status(500).json({ message: "Pile not deleted" });
    }
    console.log(result);
    return res
      .status(200)
      .json({ success: true, message: "Pile permanetly deleted" });
  } catch (error) {
    console.log(error);
  }
};

export const changeCategory = async (req, res) => {
  try {
    const { id } = req.user;
    let _id = req.body;
    const { category } = req.body;
    console.log(_id);
    if (Array.isArray(_id)) {
      throw new TypeError("Expected item to be an object.");
    }
    const result = await Links.updateOne(
      { userId: id, _id },
      { $set: { category } }
    );
    console.log(result);
    if (!result || result.modifiedCount <= 0) {
      return res
        .status(500)
        .json({ success: false, message: "couldn't change category " });
    }
    return res.status(200).json({ success: true, data: "category changed" });
  } catch (error) {
    console.log(error);
    if (error instanceof TypeError) {
      return res.status(400).json({ error: "invalid input: " + error.message });
    }

    res.status(500).json({ error: "Internal Server Error" });
  }
};
