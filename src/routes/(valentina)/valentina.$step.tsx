import { Card, CardContent } from "@/components/ui-custom/valentines/card";
import { authClient } from "@/lib/auth-client";
import { createFileRoute } from "@tanstack/react-router";
import React from "react";

export const Route = createFileRoute("/(valentina)/valentina/$step")({
  component: RouteComponent,
  loader: ({ context }) => {
    return { user: context.user };
  },
});

function RouteComponent() {
  const { user } = Route.useLoaderData();
  const { step } = Route.useParams();
  const stepNum = parseInt(step, 10);

  if (!user.email.startsWith("darcybalaga")) {
    return <NotMomot />;
  }

  switch (stepNum) {
    case 0:
      return <Step1 />;
    case 1:
      return <Step2 />;
    case 2:
      return <Step3 />;
    default:
      return <div>Unknown step</div>;
  }
}

function Step1() {
  return (
    <div className="flex w-full flex-col items-center">
      <Card className="w-full">
        <CardContent className="w-full">
          <h1>HELLO!</h1>
          <h1>MY LOVE!</h1>
          <p>😍</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Step2() {
  return <div>STEP 1</div>;
}

function Step3() {
  return <div>STEP 1</div>;
}

function NotMomot() {
  const [countdown, setCountdown] = React.useState(10);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((countdown) => countdown - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          location.reload();
        },
      },
    });
  };

  React.useEffect(() => {
    if (countdown === 0) {
      handleSignOut();
    }
  }, [countdown]);

  return (
    <>
      <p className="">😡</p>
      <h1 className="text-4xl font-bold">WAIT A MINUTE!</h1>
      <h1 className="text-4xl font-bold">YOU ARE NOT MOMOT</h1>
      KICKING YOU OUT IN {countdown < 1 ? 0 : countdown} SECONDS
    </>
  );
}
