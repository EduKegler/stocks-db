const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = 3002;
const JSON_SERVER_URL = "http://localhost:3001";

app.use(cors());
app.use(express.json());

async function makeOperation(symbol, data) {
  try {
    const response = await axios.get(`${JSON_SERVER_URL}/portfolio/${symbol}`);
    const trades = response.data.trades || [];
    trades.push(data);
    await axios.put(`${JSON_SERVER_URL}/portfolio/${symbol}`, {
      id: symbol,
      trades,
    });
    return response.data;
  } catch (error) {
    const response = await axios.post(`${JSON_SERVER_URL}/portfolio`, {
      id: symbol,
      trades: [data],
    });
    return response.data;
  }
}

function calculatePortfolio(trades) {
  const portfolio = trades.reduce(
    (acc, trade) => {
      const quantity = trade.type === "BUY" ? trade.quantity : -trade.quantity;
      acc.totalShares += quantity;
      acc.currentValue += quantity * trade.strikePrice;
      acc.averagePrice = acc.totalShares
        ? acc.currentValue / acc.totalShares
        : 0;
      return acc;
    },
    {
      totalShares: 0,
      currentValue: 0,
      averagePrice: 0,
    }
  );

  return portfolio;
}

function getRandomPriceChange() {
  const minChange = 0.1;
  const maxChange = 3.0;
  const randomChange = Math.random() * (maxChange - minChange) + minChange;
  return Math.random() < 0.5 ? -randomChange : randomChange;
}

app.post("/api/buy", async (req, res) => {
  try {
    const { symbol, quantity, strikePrice } = req.body;
    const data = {
      id: Date.now(),
      type: "BUY",
      quantity,
      strikePrice,
      timestamp: new Date().toISOString(),
    };
    await makeOperation(symbol, data);
    res.status(201).json({ message: "Buy order processed successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to process buy order" });
  }
});

app.post("/api/sell", async (req, res) => {
  try {
    const { symbol, quantity, strikePrice } = req.body;
    const data = {
      id: Date.now(),
      type: "SELL",
      quantity,
      strikePrice,
      timestamp: new Date().toISOString(),
    };
    await makeOperation(symbol, data);
    res.status(201).json({ message: "Buy order processed successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to process sell order" });
  }
});

app.get("/api/assets/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const response = await axios.get(`${JSON_SERVER_URL}/assets/${symbol}`);

    const asset = response.data;
    asset.price = asset.price + getRandomPriceChange();

    res.json(asset);
  } catch (error) {
    res.status(500).json({ error: "Failed to process" });
  }
});

app.get("/api/assets", async (req, res) => {
  try {
    const response = await axios.get(`${JSON_SERVER_URL}/assets`);
    res.json(
      response.data.map((asset) => ({
        ...asset,
        price: asset.price + getRandomPriceChange(),
      }))
    );
  } catch (error) {
    res.status(500).json({ error: "Failed to process" });
  }
});

app.get("/api/portfolio", async (req, res) => {
  try {
    const response = await axios.get(`${JSON_SERVER_URL}/portfolio`);
    const assetsResponse = await axios.get(`${JSON_SERVER_URL}/assets`);

    let assets = {};
    response.data.forEach((myAsset) => {
      const assetInfo = assetsResponse.data.find(
        (assetB) => myAsset.id === assetB.id
      );
      if (myAsset) {
        const perfomance = calculatePortfolio(myAsset.trades);
        assets[myAsset.id] = {
          price: assetInfo.price + getRandomPriceChange(),
          name: assetInfo.name,
          symbol: assetInfo.symbol,
          ...perfomance,
        };
      }
    });
    res.json({
      assets,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch trades" });
  }
});

app.get("/api/trades/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const response = await axios.get(`${JSON_SERVER_URL}/portfolio/${symbol}`);
    const trades = response.data.trades || [];
    let portfolio = calculatePortfolio(trades);
    res.json({
      trades,
      portfolio,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch trades" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
