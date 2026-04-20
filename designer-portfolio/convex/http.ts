import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// 健康检查
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    return new Response(
      JSON.stringify({
        status: "ok",
        timestamp: Date.now(),
        service: "FolioStack API",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }),
});

// 获取作品集页面
http.route({
  path: "/portfolio/:username",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const username = url.pathname.split("/").pop();

    return new Response(
      JSON.stringify({
        username,
        message: "Portfolio page",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }),
});

// 获取作品详情
http.route({
  path: "/work/:uuid",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const uuid = url.pathname.split("/").pop();

    return new Response(
      JSON.stringify({
        uuid,
        message: "Work detail",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }),
});

// 跟踪分析事件
http.route({
  path: "/analytics/track",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();

    // 记录分析事件
    await ctx.runMutation("analytics:create", {
      eventType: body.eventType,
      workId: body.workId,
      portfolioId: body.portfolioId,
      visitorId: body.visitorId,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
      userAgent: request.headers.get("user-agent") || "unknown",
      referrer: body.referrer,
      pageUrl: body.pageUrl,
      metadata: body.metadata ? JSON.stringify(body.metadata) : undefined,
    });

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }),
});

export default http;
