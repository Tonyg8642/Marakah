import AppRouter from "./router/AppRouter";
import RouteSeo from "./seo/RouteSeo";

export default function App() {
  return (
    <>
      <RouteSeo />
      <AppRouter />
    </>
  );
}
