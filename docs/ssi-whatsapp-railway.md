# SSI WhatsApp worker on Railway

Deploy this repository as a separate Railway service using `Dockerfile.whatsapp`.

## Required Railway variables

- `WHATSAPP_WORKER_SECRET`: shared bearer secret used by SSI/Vercel.
- `SSI_WHATSAPP_TARGET_GROUP_ID`: `120363410742125046@g.us`
- `SSI_WHATSAPP_TARGET_GROUP_NAME`: `SPIKE INDEX`
- `WHATSAPP_SESSION_PATH`: `/data/whatsapp-session`
- `WHATSAPP_QR_PATH`: `/data/whatsapp-qr.png`

Railway provides `PORT`; do not set it manually unless needed.

## Persistent volume

Attach a Railway volume mounted at `/data`.

Without the volume WhatsApp will require a new QR scan after each redeploy/restart.

## First authorization

1. Deploy the service.
2. Open `https://<railway-service-domain>/qr`.
3. Scan the QR in WhatsApp: `Linked devices -> Link a device`.
4. Check `https://<railway-service-domain>/health`; `ready` must be `true`.

## Wire SSI/Vercel to Railway

Set these Vercel production variables for `spike-ua-index`:

- `SSI_WHATSAPP_ENABLED=1`
- `SSI_WHATSAPP_WEBHOOK_URL=https://<railway-service-domain>/send`
- `SSI_WHATSAPP_WEBHOOK_SECRET=<same value as WHATSAPP_WORKER_SECRET>`
- `SSI_WHATSAPP_TARGET_GROUP_ID=120363410742125046@g.us`
- `SSI_WHATSAPP_TARGET_GROUP_NAME=SPIKE INDEX`

Redeploy `spike-ua-index` after changing Vercel variables.
