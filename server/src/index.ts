import "reflect-metadata";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { UserResolver } from "./resolvers/UserResolver";
import { createConnection } from "typeorm";
import cookieParser from "cookie-parser";
import cors from "cors";
import { verify } from "jsonwebtoken";
import { User } from "./entity/User";
import { createAccessToken, createRefreshAccessToken } from "./auth/auth";
import { sendRefreshToken } from "./utils/SendRefreshToken";

(async () => {
  const app = express();
  app.use(
    cors({
      origin: "http://localhost:3000",
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.post("/refresh_token", async (req, res) => {
    const token = req.cookies.jid;
    if (!token) {
      return res.send({ ok: false, accessToken: "" });
    }
    let payload: any = null;
    try {
      payload = verify(token, process.env.REFRESH_TOKEN_SECRET!);
      const user = await User.findOne({ id: payload.userId });
      if (!user) {
        return res.send({ ok: false, accessToken: "" });
      }
      if (user.tokenVersion !== payload.tokenVersion) {
        return res.send({ ok: false, accessToken: "" });
      }

      sendRefreshToken(res, createRefreshAccessToken(user));
      return res.send({
        ok: true,
        accessToken: createAccessToken(user),
      });
    } catch (err) {
      console.log(err);
      return res.send({ ok: false, accessToken: "" });
    }
  });

  await createConnection();
  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [UserResolver],
    }),
    context: ({ req, res }) => ({ req, res }),
  });
  apolloServer.applyMiddleware({ app, cors: false });
  app.listen(4000, () => console.log("server running"));
})();
