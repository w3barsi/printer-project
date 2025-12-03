import { useAutoAnimate } from "@formkit/auto-animate/react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Container } from "@/components/layouts/container";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/testfruits")({
  component: RouteComponent,
});

type BasketItem = {
  id: number;
  fruit: string;
  cname: string;
};

const fruitBasket = [
  { fruit: "🍓 Strawberry", cname: "bg-red-500" },
  { fruit: "🥥 Coconut", cname: "bg-amber-700" },
  { fruit: "🥝 Kiwi", cname: "bg-lime-500" },
  { fruit: "🍇 Grape", cname: "bg-purple-600" },
  { fruit: "🍉 Watermelon", cname: "bg-green-500" },
  { fruit: "🍍 Pineapple", cname: "bg-yellow-400" },
  { fruit: "🍐 Pear", cname: "bg-lime-400" },
  { fruit: "🍑 Peach", cname: "bg-orange-300" },
  { fruit: "🫐 Blueberry", cname: "bg-blue-600" },
  { fruit: "🍊 Orange", cname: "bg-orange-500" },
  { fruit: "🥭 Mango", cname: "bg-amber-400" },
];

function RouteComponent() {
  const [arr, setArr] = useState<BasketItem[]>([]);

  const [parent] = useAutoAnimate(/* optional config */);

  const addFruit = () => {
    setArr((prevArr) => [
      {
        ...fruitBasket[Math.floor(Math.random() * fruitBasket.length)],
        id: Math.floor(Math.random() * 1_000_000),
      },
      ...prevArr.slice(0, 4),
    ]);
  };
  return (
    <Container className="flex flex-col gap-2">
      <Button onClick={addFruit}>Add Fruit +</Button>
      <div className="grid size-20 grid-cols-1 grid-rows-1 place-items-center bg-red-100">
        <div className="col-start-1 row-start-1">1</div>
        <div className="col-start-1 row-start-1">2</div>
      </div>
      <div ref={parent} className="flex flex-col gap-2">
        {arr.map((fruit) => (
          <div
            key={fruit.id}
            className={`${fruit.cname} flex min-h-10 items-center px-4`}
          >
            {fruit.fruit}
          </div>
        ))}
      </div>
    </Container>
  );
}
