import dynamic from "next/dynamic";
import MapLoading from "@/components/MapLoading";

const MapExplorer = dynamic(() => import("@/components/MapExplorer"), {
  ssr: false,
  loading: () => <MapLoading />,
});

export default function Home() {
  return <MapExplorer />;
}
