import type { FastifyInstance } from "fastify";
import { jwtAuth } from "../../middleware/jwt-auth.js";
import { getChannelAccess, canEdit } from "../../middleware/channel-access.js";
import { prisma } from "../../lib/prisma.js";
import { viewerRequestService } from "./service.js";
import type { RequestStatus } from "@cristream/shared";

export async function requestRoutes(app: FastifyInstance) {
  app.addHook("preHandler", jwtAuth);

  // List requests for a channel
  app.get<{ Params: { cid: string }; Querystring: { status?: string } }>(
    "/:cid/requests",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (role === "none") {
        return reply.status(403).send({ success: false, error: "Insufficient permissions" });
      }
      const reqs = await viewerRequestService.list(request.params.cid, request.query.status);
      return { success: true, data: reqs };
    }
  );

  // Update request status
  app.patch<{ Params: { cid: string; rid: string }; Body: { status: RequestStatus } }>(
    "/:cid/requests/:rid",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (!canEdit(role)) {
        return reply.status(403).send({ success: false, error: "Insufficient permissions" });
      }
      const req = await viewerRequestService.updateStatus(
        request.params.cid,
        request.params.rid,
        request.body.status
      );
      return { success: true, data: req };
    }
  );

  // Delete a request
  app.delete<{ Params: { cid: string; rid: string } }>(
    "/:cid/requests/:rid",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (!canEdit(role)) {
        return reply.status(403).send({ success: false, error: "Insufficient permissions" });
      }
      await viewerRequestService.delete(request.params.cid, request.params.rid);
      return { success: true };
    }
  );

  // Clear done/rejected requests
  app.delete<{ Params: { cid: string } }>(
    "/:cid/requests",
    async (request, reply) => {
      const role = await getChannelAccess(request.params.cid, request.user!.sub);
      if (!canEdit(role)) {
        return reply.status(403).send({ success: false, error: "Insufficient permissions" });
      }
      await viewerRequestService.clearDone(request.params.cid);
      return { success: true };
    }
  );
}

// Public route — no JWT, uses overlay token for channel identification
export async function publicRequestRoutes(app: FastifyInstance) {
  // Public submit page
  app.get<{ Params: { overlayToken: string } }>(
    "/requests/:overlayToken",
    async (request, reply) => {
      const channel = await prisma.channel.findUnique({
        where: { overlayToken: request.params.overlayToken },
      });
      if (!channel) return reply.status(404).send("Channel not found");

      return reply.type("text/html").send(generateRequestPageHtml(channel.displayName, request.params.overlayToken));
    }
  );

  // Public submit endpoint
  app.post<{ Params: { overlayToken: string }; Body: { displayName: string; message: string } }>(
    "/requests/:overlayToken",
    async (request, reply) => {
      const channel = await prisma.channel.findUnique({
        where: { overlayToken: request.params.overlayToken },
      });
      if (!channel) return reply.status(404).send({ success: false, error: "Channel not found" });

      const { displayName, message } = request.body;
      if (!displayName?.trim() || !message?.trim()) {
        return reply.status(400).send({ success: false, error: "Name and message are required" });
      }
      if (message.length > 500) {
        return reply.status(400).send({ success: false, error: "Message too long (max 500 chars)" });
      }

      const req = await viewerRequestService.create(channel.id, displayName.trim(), message.trim());
      return { success: true, data: req };
    }
  );
}

function generateRequestPageHtml(channelName: string, overlayToken: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Request - ${channelName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', system-ui, sans-serif;
    background: #0f0f0f;
    color: #e5e5e5;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 40px 16px;
  }
  .container {
    width: 100%;
    max-width: 500px;
  }
  h1 {
    font-size: 24px;
    margin-bottom: 4px;
    color: #fff;
  }
  .subtitle {
    color: #888;
    font-size: 14px;
    margin-bottom: 24px;
  }
  .card {
    background: #1a1a1a;
    border: 1px solid #2a2a2a;
    border-radius: 12px;
    padding: 24px;
  }
  label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 6px;
    color: #ccc;
  }
  input, textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #333;
    border-radius: 8px;
    background: #0f0f0f;
    color: #e5e5e5;
    font-size: 14px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.2s;
  }
  input:focus, textarea:focus {
    border-color: #9147ff;
  }
  textarea {
    resize: vertical;
    min-height: 100px;
  }
  .field { margin-bottom: 16px; }
  .char-count {
    text-align: right;
    font-size: 12px;
    color: #666;
    margin-top: 4px;
  }
  button {
    width: 100%;
    padding: 12px;
    border: none;
    border-radius: 8px;
    background: #9147ff;
    color: #fff;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }
  button:hover { background: #7c3aed; }
  button:disabled { background: #444; cursor: not-allowed; }
  .success {
    text-align: center;
    padding: 32px 0;
    color: #22c55e;
    font-size: 18px;
    font-weight: 600;
  }
  .error {
    color: #ef4444;
    font-size: 13px;
    margin-bottom: 12px;
  }
</style>
</head>
<body>
<div class="container">
  <h1>${channelName}</h1>
  <p class="subtitle">Submit a request</p>
  <div class="card">
    <div id="form-view">
      <div class="field">
        <label for="name">Your Name</label>
        <input id="name" type="text" placeholder="Twitch username" maxlength="50" />
      </div>
      <div class="field">
        <label for="msg">Request</label>
        <textarea id="msg" placeholder="What would you like to request?" maxlength="500"></textarea>
        <div class="char-count"><span id="chars">0</span>/500</div>
      </div>
      <div id="error" class="error" style="display:none"></div>
      <button id="submit" onclick="submitRequest()">Submit Request</button>
    </div>
    <div id="success-view" class="success" style="display:none">
      Request submitted!<br>
      <span style="font-size:14px;color:#888;font-weight:400">The streamer will see it shortly.</span>
      <br><br>
      <button onclick="reset()" style="width:auto;padding:8px 24px;font-size:13px">Submit Another</button>
    </div>
  </div>
</div>
<script>
  const msgEl = document.getElementById('msg');
  const charsEl = document.getElementById('chars');
  msgEl.addEventListener('input', () => { charsEl.textContent = msgEl.value.length; });

  async function submitRequest() {
    const name = document.getElementById('name').value.trim();
    const message = msgEl.value.trim();
    const errEl = document.getElementById('error');
    errEl.style.display = 'none';

    if (!name || !message) {
      errEl.textContent = 'Please fill in both fields.';
      errEl.style.display = 'block';
      return;
    }

    const btn = document.getElementById('submit');
    btn.disabled = true;
    btn.textContent = 'Submitting...';

    try {
      const res = await fetch('/requests/${overlayToken}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: name, message })
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('form-view').style.display = 'none';
        document.getElementById('success-view').style.display = 'block';
      } else {
        errEl.textContent = data.error || 'Failed to submit.';
        errEl.style.display = 'block';
      }
    } catch (e) {
      errEl.textContent = 'Network error. Please try again.';
      errEl.style.display = 'block';
    }
    btn.disabled = false;
    btn.textContent = 'Submit Request';
  }

  function reset() {
    document.getElementById('name').value = '';
    msgEl.value = '';
    charsEl.textContent = '0';
    document.getElementById('form-view').style.display = 'block';
    document.getElementById('success-view').style.display = 'none';
  }
</script>
</body>
</html>`;
}
