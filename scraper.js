const cheerio = require("cheerio")
const axios = require("axios")
const fs = require("fs")
const fsPromises = fs.promises
const csv = require('async-csv')

let baseUrl = "https://apps.shopify.com"

const fetchData = async (siteUrl) => {
  const result = await axios.get(siteUrl)
  return cheerio.load(result.data)
}

const getResults = async (appName) => {
  var allPagesScraped = false
  var siteUrl = `${baseUrl}/${appName}/reviews`
  var allReviews = []

  while (!allPagesScraped) {
    console.info(`scraping ${siteUrl}`)
    const $ = await fetchData(siteUrl)
    allReviews = allReviews.concat(scrapeReviewPage($))

    // get the anchor element with rel attribute set to next and extract its href
    const nextPageUrl = $(".search-pagination > a[rel=next]").attr("href")
    if (!nextPageUrl) {
      allPagesScraped = true
      console.info("all pages scraped!")
    }
    siteUrl = `${baseUrl}/${nextPageUrl}`
  }

  return allReviews
}

const scrapeReviewPage = ($) => {
  const reviews = []

  $(".grid > .grid__item > .review-listing").each((index, element) => {
    const review = {}
    const reviewNode = $(element).find("div").first()
    const reviewMerchant = $(reviewNode)
      .find(".review-listing-header > h3")
      .text()
    const reviewRating = $(reviewNode)
      .find(".review-metadata")
      .first()
      .find(".ui-star-rating")
      .data("rating")
    const reviewDate = $(reviewNode)
      .find(".review-metadata")
      .children()
      .eq(1)
      .find(".review-metadata__item-value")
      .text()
    const reviewContent = $(reviewNode)
      .find(".review-content")
      .find("div > p")
      .text()
    // reviewer name has newline and multiple spaces
    review["merchant"] = cleanString(reviewMerchant)
    review["rating"] = reviewRating
    // date has newline and multiple spaces
    review["date"] = cleanString(reviewDate)
    review["review"] = cleanString(reviewContent)

    reviews.push(review)
  })
  return reviews
}

/**
 * Removes new line char and replaces multiple spaces with single space
 * @param {String} input
 */
const cleanString = (input) => {
  // return input.replace(/\n/g, "").replace(/\s\s+/g, " ").trim()
  return input.trim()
}

const appName = "limespot"
const headers = {
  merchant: 'merchant',
  rating: 'rating',
  date: 'date',
  review: 'review'
}

async function saveAppReviews(storeName) {
  const reviews = await getResults(appName)
  console.log(reviews)
  const csvToWrite = await csv.stringify(reviews, {header: true, columns: headers})
  await fsPromises.writeFile(`output/${appName}.csv`, csvToWrite)
  return reviews.length
  try {
  } catch (error) {
    console.error(`Error writing results for ${appName}. Error: ${error}`)
    throw error
  }
}

saveAppReviews().then((res, err) => {
  if (err) {
    console.error(`Unable to save app reviews for ${appName}`)
  } else {
    console.info(`Successfully saved ${res} app reviews for ${appName}`)
  }
})
