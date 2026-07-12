import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { UpdateShippingPolicyDto } from '../dto/shipping-policy.dto';

/**
 * Frais de port dynamiques par vendeur (modèle ShippingPolicy, 1 politique par artisanId).
 *
 * Rétrocompatibilité : un vendeur SANS politique conserve le forfait historique de 5,99 € — le
 * comportement d'une commande mono-vendeur sans politique est donc identique à l'ancien code.
 *
 * Ne dépend que de PrismaService (pas de relation formelle ShippingPolicy -> User : accès par artisanId).
 */
@Injectable()
export class ShippingPolicyService {
  /** Forfait de port historique, servant de défaut quand un vendeur n'a pas défini de politique. */
  static readonly DEFAULT_FLAT_RATE = 5.99;

  constructor(private prisma: PrismaService) {}

  /**
   * Politique du vendeur normalisée en nombres (JSON propre), ou les DÉFAUTS si aucune politique
   * n'existe encore (freeShipping=false, flatRate=5,99 €, pas de franco). `isDefault` indique au front
   * qu'aucune politique n'est encore persistée.
   */
  async getPolicy(artisanId: string) {
    const policy = await this.prisma.shippingPolicy.findUnique({ where: { artisanId } });
    if (!policy) {
      return {
        artisanId,
        freeShipping: false,
        flatRate: ShippingPolicyService.DEFAULT_FLAT_RATE,
        freeThreshold: null as number | null,
        isDefault: true,
      };
    }
    return {
      artisanId,
      freeShipping: policy.freeShipping,
      flatRate: Number(policy.flatRate),
      freeThreshold: policy.freeThreshold != null ? Number(policy.freeThreshold) : null,
      isDefault: false,
    };
  }

  /**
   * UPSERT de la politique du vendeur (clé = artisanId). Mise à jour PARTIELLE : un champ absent du DTO
   * n'écrase pas la valeur existante. `freeThreshold === null` désactive explicitement le franco de port.
   */
  async upsertPolicy(artisanId: string, dto: UpdateShippingPolicyDto) {
    const updateData: {
      freeShipping?: boolean;
      flatRate?: Decimal;
      freeThreshold?: Decimal | null;
    } = {};
    if (dto.freeShipping !== undefined) updateData.freeShipping = dto.freeShipping;
    if (dto.flatRate !== undefined) updateData.flatRate = new Decimal(dto.flatRate);
    if (dto.freeThreshold !== undefined) {
      updateData.freeThreshold = dto.freeThreshold === null ? null : new Decimal(dto.freeThreshold);
    }

    await this.prisma.shippingPolicy.upsert({
      where: { artisanId },
      create: {
        artisanId,
        freeShipping: dto.freeShipping ?? false,
        flatRate:
          dto.flatRate !== undefined
            ? new Decimal(dto.flatRate)
            : new Decimal(ShippingPolicyService.DEFAULT_FLAT_RATE),
        freeThreshold:
          dto.freeThreshold != null ? new Decimal(dto.freeThreshold) : null,
      },
      update: updateData,
    });

    return this.getPolicy(artisanId);
  }

  /**
   * Frais de port d'un vendeur donné pour un sous-total (produits HT, hors TVA/port) :
   *  - pas de politique  -> forfait défaut 5,99 € (rétrocompat) ;
   *  - freeShipping      -> 0 ;
   *  - franco atteint (freeThreshold défini ET sous-total ≥ seuil) -> 0 ;
   *  - sinon             -> flatRate.
   */
  private shippingForSeller(
    sellerSubtotal: number,
    policy: { freeShipping: boolean; flatRate: Decimal; freeThreshold: Decimal | null } | undefined,
  ): number {
    if (!policy) return ShippingPolicyService.DEFAULT_FLAT_RATE;
    if (policy.freeShipping) return 0;
    if (policy.freeThreshold != null && sellerSubtotal >= Number(policy.freeThreshold)) return 0;
    return Number(policy.flatRate);
  }

  /**
   * Frais de port TOTAL d'une commande multi-vendeurs : regroupe les sous-totaux par vendeur
   * (artisanId), applique SA politique à chacun et somme. Une seule requête (findMany IN) pour tous
   * les vendeurs de la commande.
   *
   * @param subtotalBySeller Map artisanId -> sous-total produits (somme des item.totalPrice) du vendeur.
   * @returns frais de port total arrondi au centime.
   */
  async computeShippingTotal(subtotalBySeller: Map<string, number>): Promise<number> {
    const artisanIds = Array.from(subtotalBySeller.keys());
    if (artisanIds.length === 0) return 0;

    const policies = await this.prisma.shippingPolicy.findMany({
      where: { artisanId: { in: artisanIds } },
    });
    const byArtisan = new Map(policies.map((p) => [p.artisanId, p]));

    let total = 0;
    for (const [artisanId, sellerSubtotal] of subtotalBySeller.entries()) {
      total += this.shippingForSeller(sellerSubtotal, byArtisan.get(artisanId));
    }
    return Math.round(total * 100) / 100;
  }
}
