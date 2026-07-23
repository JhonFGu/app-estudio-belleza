CREATE TABLE "commission_liquidation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"liquidation_id" uuid NOT NULL,
	"transaction_item_id" uuid NOT NULL,
	"commission_amount" numeric(10, 2) NOT NULL,
	"applied_rate" numeric(5, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commission_liquidations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"collaborator_id" uuid NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"notes" text,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commission_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"collaborator_id" uuid NOT NULL,
	"service_id" uuid,
	"product_id" uuid,
	"commission_rate" numeric(5, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "commission_liquidation_items" ADD CONSTRAINT "commission_liquidation_items_liquidation_id_commission_liquidations_id_fk" FOREIGN KEY ("liquidation_id") REFERENCES "public"."commission_liquidations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_liquidation_items" ADD CONSTRAINT "commission_liquidation_items_transaction_item_id_transaction_items_id_fk" FOREIGN KEY ("transaction_item_id") REFERENCES "public"."transaction_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_liquidations" ADD CONSTRAINT "commission_liquidations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_liquidations" ADD CONSTRAINT "commission_liquidations_collaborator_id_collaborators_id_fk" FOREIGN KEY ("collaborator_id") REFERENCES "public"."collaborators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_collaborator_id_collaborators_id_fk" FOREIGN KEY ("collaborator_id") REFERENCES "public"."collaborators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commission_rules" ADD CONSTRAINT "commission_rules_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "liquidation_items_liquidation_idx" ON "commission_liquidation_items" USING btree ("liquidation_id");--> statement-breakpoint
CREATE INDEX "commission_liquidations_tenant_idx" ON "commission_liquidations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "commission_liquidations_collaborator_idx" ON "commission_liquidations" USING btree ("collaborator_id");--> statement-breakpoint
CREATE INDEX "commission_rules_tenant_idx" ON "commission_rules" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "commission_rules_collaborator_idx" ON "commission_rules" USING btree ("collaborator_id");--> statement-breakpoint
ALTER TABLE "collaborators" DROP COLUMN "commission_rate";--> statement-breakpoint
ALTER TABLE "services" DROP COLUMN "commission_rate";