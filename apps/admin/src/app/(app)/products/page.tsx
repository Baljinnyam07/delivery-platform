import { FactoryIcon } from "lucide-react";
import type { Metadata } from "next";
import { Card } from "@/components/layout/card";
import { PageHeader } from "@/components/layout/page-header";
import { FactoryDialogButton } from "@/features/products/product-dialogs";
import { ProductsBrowser } from "@/features/products/products-browser";
import { listFactoriesWithProducts, listStockMovements } from "@/features/products/queries";

export const metadata: Metadata = { title: "Бараа ба нөөц" };

export default async function ProductsPage() {
  const [factories, movements] = await Promise.all([listFactoriesWithProducts(), listStockMovements(50)]);

  return (
    <>
      <PageHeader
        title="Бараа ба нөөц"
        description="Үйлдвэр, бараа, үнэ болон агуулахын үлдэгдэл."
        actions={<FactoryDialogButton />}
      />

      {factories.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-neon-cyan/10 text-neon-cyan">
              <FactoryIcon className="size-5" />
            </span>
            <p className="text-sm font-medium">Эхлээд үйлдвэрээ бүртгэнэ үү</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Үйлдвэр бүрт бараагаа нэмж, үнэ болон нөөцийг оруулна. Тайлан үйлдвэр тус бүрээр гарна.
            </p>
            <FactoryDialogButton />
          </div>
        </Card>
      ) : (
        <ProductsBrowser factories={factories} movements={movements} />
      )}
    </>
  );
}
