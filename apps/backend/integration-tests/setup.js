const { setDefaultResultOrder } = require("node:dns")

setDefaultResultOrder("ipv4first")

const { MetadataStorage } = require("@medusajs/framework/mikro-orm/core")

MetadataStorage.clear()
