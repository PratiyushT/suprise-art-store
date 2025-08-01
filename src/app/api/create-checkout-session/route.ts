import Stripe from "stripe";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: process.env.STRIPE_API_VERSION as Stripe.LatestApiVersion,
});

export async function POST(req: Request) {
  try {
    const { tier, email, tipAmount, image } = await req.json();

    const totalAmount = tier.price + tipAmount;
    const orderId = `ORDER-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 10)}`;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: tier.title,
            description: tier.description,
          },
          unit_amount: tier.price * 100,
        },
        quantity: 1,
      },
    ];

    if (tipAmount > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "Tip",
          },
          unit_amount: tipAmount * 100,
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: email,
      line_items: lineItems,
      mode: "payment",
      success_url: `${
        process.env.NEXT_PUBLIC_BASE_URL
      }/success?amount=${totalAmount.toFixed(2)}&email=${encodeURIComponent(
        email
      )}`,

      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancel?tier=${
        tier.id
      }&tierName=${encodeURIComponent(tier.title)}&tierPrice=${tier.price}`,

      // Metadata for webhook & Zapier
      metadata: {
        tier: tier.title,
        price: tier.price.toString(),
        tip: tipAmount.toString(),
        total: totalAmount.toString(),
        email,
        orderId,
        imageUrl: image?.url || "",
        imageFilename: image?.filename || "",
        imageAlt: image?.alt || "",
        photographer: image?.photographer || "",
        pexelsId: image?.pexelsId?.toString() || "",
      },
    });

    return NextResponse.json({ sessionUrl: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    return NextResponse.json(
      { error: "Stripe session creation failed" },
      { status: 500 }
    );
  }
}
