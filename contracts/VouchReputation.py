# # v0.2.18
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *

import json
import typing


# ------------------------------------------------------------------
# Canonical enum sets
# ------------------------------------------------------------------

VALID_VERDICT_STATUS = {
    "trustworthy", "weakly_supported", "overstated", "contradicted",
    "unverifiable", "impersonation_risk", "material_breach",
    "invalid_challenge", "insufficient_evidence",
}
VALID_ACTION = {
    "keep_active", "downgrade", "suspend", "slash_partial",
    "slash_full", "expire_without_slash", "dismiss_challenge",
}
VALID_CLAIM_ALIGNMENT   = {"full", "partial", "weak", "none", "contradicted"}
VALID_EVIDENCE_STRENGTH = {"high", "medium", "low", "insufficient"}
VALID_MATERIALITY       = {"high", "medium", "low", "none"}
VALID_CATEGORIES        = {
    "engineering", "design", "research", "operations",
    "community", "ai_agent", "identity", "other",
}
VALID_CHALLENGE_TYPE = {
    "false_claim", "impersonation", "evidence_fabrication",
    "scope_mismatch", "expired_capability", "conduct_violation",
}

# Bond minimums in wei (1 GEN = 1e18 wei)
MICRO_BOND_MIN    = 1   * 10**18
STANDARD_BOND_MIN = 10  * 10**18
HIGH_TRUST_MIN    = 50  * 10**18
INSTITUTIONAL_MIN = 200 * 10**18
MIN_ENDORSEMENT   = 1   * 10**18
MIN_CHALLENGE     = 2   * 10**18


class VouchReputation(gl.Contract):
    """
    VouchReputation — GEN-backed reputation bond protocol.

    Capsule lifecycle:
      active → challenged → (verdict applied) →
      upheld | downgraded | suspended | slashed | expired | retired

    Verdict source: GenLayer validators only (Optimistic Democracy).
    Admin page: monitor-only. No admin mutation functions exist.
    """

    owner:            str
    contract_version: str
    paused:           bool

    capsule_counter:     u256
    endorsement_counter: u256
    challenge_counter:   u256
    verdict_counter:     u256
    protocol_reserve:    u256

    capsules:             TreeMap[str, str]
    endorsements:         TreeMap[str, str]
    challenges:           TreeMap[str, str]
    verdicts:             TreeMap[str, str]
    owner_capsules:       TreeMap[str, str]
    capsule_endorsements: TreeMap[str, str]
    capsule_challenges:   TreeMap[str, str]
    endorser_index:       TreeMap[str, str]
    challenger_index:     TreeMap[str, str]
    wallet_activity:      TreeMap[str, str]
    public_capsule_ids:   str

    def __init__(self) -> None:
        self.owner            = gl.message.sender_address.as_hex
        self.contract_version = "1.0.0"
        self.paused           = False

        self.capsule_counter     = u256(0)
        self.endorsement_counter = u256(0)
        self.challenge_counter   = u256(0)
        self.verdict_counter     = u256(0)
        self.protocol_reserve    = u256(0)

        self.capsules             = TreeMap()
        self.endorsements         = TreeMap()
        self.challenges           = TreeMap()
        self.verdicts             = TreeMap()
        self.owner_capsules       = TreeMap()
        self.capsule_endorsements = TreeMap()
        self.capsule_challenges   = TreeMap()
        self.endorser_index       = TreeMap()
        self.challenger_index     = TreeMap()
        self.wallet_activity      = TreeMap()

        self.public_capsule_ids = "[]"

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _sender(self) -> str:
        return gl.message.sender_address.as_hex.lower()

    def _json(self, value: typing.Any) -> str:
        return json.dumps(value, sort_keys=True)

    def _load(self, raw: str) -> typing.Any:
        if raw is None or raw == "":
            return {}
        return json.loads(raw)

    def _require_not_paused(self) -> None:
        if self.paused:
            raise gl.vm.UserError("Contract is paused")

    def _require_non_empty(self, value: str, field: str) -> None:
        if value is None or len(value.strip()) == 0:
            raise gl.vm.UserError(field + " is required")

    def _require_owner(self) -> None:
        if self._sender() != self.owner.lower():
            raise gl.vm.UserError("Only contract owner")

    def _tier(self, wei: int) -> str:
        if wei >= INSTITUTIONAL_MIN: return "institutional"
        if wei >= HIGH_TRUST_MIN:    return "high_trust"
        if wei >= STANDARD_BOND_MIN: return "standard"
        return "micro"

    def _next_id(self, prefix: str, counter_name: str) -> str:
        if counter_name == "capsule":
            self.capsule_counter = self.capsule_counter + u256(1)
            return prefix + "-" + str(self.capsule_counter)
        if counter_name == "endorsement":
            self.endorsement_counter = self.endorsement_counter + u256(1)
            return prefix + "-" + str(self.endorsement_counter)
        if counter_name == "challenge":
            self.challenge_counter = self.challenge_counter + u256(1)
            return prefix + "-" + str(self.challenge_counter)
        if counter_name == "verdict":
            self.verdict_counter = self.verdict_counter + u256(1)
            return prefix + "-" + str(self.verdict_counter)
        raise gl.vm.UserError("Unknown counter: " + counter_name)

    def _require_capsule(self, capsule_id: str) -> typing.Any:
        raw = self.capsules.get(capsule_id, "")
        if raw == "":
            raise gl.vm.UserError("Capsule not found: " + capsule_id)
        return self._load(raw)

    def _require_endorsement(self, endorsement_id: str) -> typing.Any:
        raw = self.endorsements.get(endorsement_id, "")
        if raw == "":
            raise gl.vm.UserError("Endorsement not found: " + endorsement_id)
        return self._load(raw)

    def _require_challenge(self, challenge_id: str) -> typing.Any:
        raw = self.challenges.get(challenge_id, "")
        if raw == "":
            raise gl.vm.UserError("Challenge not found: " + challenge_id)
        return self._load(raw)

    def _require_verdict(self, verdict_id: str) -> typing.Any:
        raw = self.verdicts.get(verdict_id, "")
        if raw == "":
            raise gl.vm.UserError("Verdict not found: " + verdict_id)
        return self._load(raw)

    def _append_list(self, store: TreeMap, key: str, value: str) -> None:
        raw = store.get(key, "")
        lst = json.loads(raw) if raw != "" else []
        lst.append(value)
        store[key] = self._json(lst)

    def _log(self, address: str, record: typing.Any) -> None:
        raw = self.wallet_activity.get(address, "")
        lst = json.loads(raw) if raw != "" else []
        lst.insert(0, record)
        if len(lst) > 200:
            lst = lst[:200]
        self.wallet_activity[address] = self._json(lst)

    def _now(self) -> int:
        import time
        return int(time.time() * 1000)

    def _validate_verdict(self, r: typing.Any) -> None:
        required = {"verdict_status", "action", "claim_alignment", "evidence_strength",
                    "materiality", "slash_bps", "confidence", "short_reason"}
        for field in required:
            if field not in r:
                raise gl.vm.UserError("Verdict missing field: " + field)
        if r["verdict_status"]    not in VALID_VERDICT_STATUS:    raise gl.vm.UserError("Invalid verdict_status: " + str(r["verdict_status"]))
        if r["action"]            not in VALID_ACTION:            raise gl.vm.UserError("Invalid action: " + str(r["action"]))
        if r["claim_alignment"]   not in VALID_CLAIM_ALIGNMENT:  raise gl.vm.UserError("Invalid claim_alignment: " + str(r["claim_alignment"]))
        if r["evidence_strength"] not in VALID_EVIDENCE_STRENGTH: raise gl.vm.UserError("Invalid evidence_strength: " + str(r["evidence_strength"]))
        if r["materiality"]       not in VALID_MATERIALITY:       raise gl.vm.UserError("Invalid materiality: " + str(r["materiality"]))
        bps = int(r["slash_bps"])
        if bps < 0 or bps > 10000:
            raise gl.vm.UserError("slash_bps out of range: " + str(bps))
        conf = int(r["confidence"])
        if conf < 0 or conf > 100:
            raise gl.vm.UserError("confidence out of range: " + str(conf))

    def _normalise_verdict_result(self, raw: typing.Any) -> typing.Any:
        if isinstance(raw, str):
            parsed = json.loads(raw)
        else:
            parsed = raw

        def pick(value: str, valid: set, fallback: str) -> str:
            v = str(value).strip().lower()
            if v in valid:
                return v
            return fallback

        bps  = int(parsed.get("slash_bps",  0))
        conf = int(parsed.get("confidence", 50))
        if bps  < 0: bps  = 0
        if bps  > 10000: bps = 10000
        if conf < 0: conf = 0
        if conf > 100: conf = 100

        return {
            "verdict_status":   pick(parsed.get("verdict_status", "unverifiable"), VALID_VERDICT_STATUS, "unverifiable"),
            "action":           pick(parsed.get("action", "keep_active"),          VALID_ACTION,          "keep_active"),
            "claim_alignment":  pick(parsed.get("claim_alignment", "weak"),        VALID_CLAIM_ALIGNMENT, "weak"),
            "evidence_strength":pick(parsed.get("evidence_strength", "low"),       VALID_EVIDENCE_STRENGTH,"low"),
            "materiality":      pick(parsed.get("materiality", "low"),             VALID_MATERIALITY,     "low"),
            "slash_bps":        bps,
            "confidence":       conf,
            "short_reason":     str(parsed.get("short_reason", ""))[:200],
        }

    # ------------------------------------------------------------------
    # Capsule lifecycle
    # ------------------------------------------------------------------

    @gl.public.write
    def create_capsule(
        self,
        claim_title: str,
        claim_body: str,
        category: str,
        scope_boundaries: str,
        public_evidence_urls: str,
        private_evidence_commitment_hash: str,
        expires_at_ms: int,
        visibility_mode: str,
        bond_amount_wei: int,
    ) -> str:
        self._require_not_paused()
        self._require_non_empty(claim_title, "claim_title")
        self._require_non_empty(claim_body, "claim_body")

        if category not in VALID_CATEGORIES:
            raise gl.vm.UserError("Invalid category: " + category)
        if bond_amount_wei < MICRO_BOND_MIN:
            raise gl.vm.UserError("Bond must be at least " + str(MICRO_BOND_MIN) + " wei (1 GEN)")

        sender = self._sender()
        now    = self._now()

        if expires_at_ms <= now:
            raise gl.vm.UserError("expires_at_ms must be in the future")

        urls: typing.List[str] = []
        if public_evidence_urls and public_evidence_urls.strip() != "":
            urls = json.loads(public_evidence_urls)
        if visibility_mode == "public" and len(urls) == 0:
            raise gl.vm.UserError("Public capsules require at least one public evidence URL")

        cid = self._next_id("CAP", "capsule")
        capsule = {
            "capsule_id": cid,
            "owner": sender,
            "claim_title": claim_title,
            "claim_body": claim_body,
            "category": category,
            "scope_boundaries": scope_boundaries,
            "public_evidence_urls": urls,
            "private_evidence_commitment_hash": private_evidence_commitment_hash,
            "bond_amount": bond_amount_wei,
            "active_bond": bond_amount_wei,
            "bond_tier": self._tier(bond_amount_wei),
            "created_at": now,
            "expires_at": expires_at_ms,
            "status": "active",
            "latest_verdict_id": "",
            "endorsement_count": 0,
            "challenge_count": 0,
            "visibility_mode": visibility_mode,
        }
        self.capsules[cid] = self._json(capsule)
        self._append_list(self.owner_capsules, sender, cid)

        if visibility_mode == "public":
            ids = json.loads(self.public_capsule_ids)
            ids.append(cid)
            self.public_capsule_ids = self._json(ids)

        self._log(sender, {"type": "create_capsule", "capsule_id": cid, "bond_wei": bond_amount_wei, "ts": now})
        return cid

    @gl.public.write
    def increase_capsule_bond(self, capsule_id: str, additional_wei: int) -> None:
        self._require_not_paused()
        sender  = self._sender()
        capsule = self._require_capsule(capsule_id)

        if capsule["owner"] != sender:
            raise gl.vm.UserError("Only owner can increase bond")
        if capsule["status"] in ("retired", "slashed", "expired"):
            raise gl.vm.UserError("Cannot increase bond on " + capsule["status"] + " capsule")
        if additional_wei <= 0:
            raise gl.vm.UserError("additional_wei must be positive")

        capsule["bond_amount"] = capsule["bond_amount"] + additional_wei
        capsule["active_bond"] = capsule["active_bond"] + additional_wei
        capsule["bond_tier"]   = self._tier(capsule["bond_amount"])
        self.capsules[capsule_id] = self._json(capsule)
        self._log(sender, {"type": "increase_bond", "capsule_id": capsule_id, "additional_wei": additional_wei, "ts": self._now()})

    @gl.public.write
    def retire_capsule(self, capsule_id: str) -> None:
        self._require_not_paused()
        sender  = self._sender()
        capsule = self._require_capsule(capsule_id)

        if capsule["owner"] != sender:
            raise gl.vm.UserError("Only owner can retire")
        if capsule["status"] == "challenged":
            raise gl.vm.UserError("Cannot retire capsule under active challenge")
        if capsule["status"] in ("retired", "slashed"):
            raise gl.vm.UserError("Capsule already " + capsule["status"])

        capsule["status"] = "retired"
        self.capsules[capsule_id] = self._json(capsule)
        self._log(sender, {"type": "retire_capsule", "capsule_id": capsule_id, "ts": self._now()})

    @gl.public.write
    def renew_capsule(
        self,
        capsule_id: str,
        new_expires_at_ms: int,
        updated_evidence_urls: str,
        additional_bond_wei: int,
    ) -> None:
        self._require_not_paused()
        sender  = self._sender()
        now     = self._now()
        capsule = self._require_capsule(capsule_id)

        if capsule["owner"] != sender:
            raise gl.vm.UserError("Only owner can renew")
        if capsule["status"] in ("retired", "slashed"):
            raise gl.vm.UserError("Cannot renew " + capsule["status"] + " capsule")
        if capsule["status"] == "challenged":
            raise gl.vm.UserError("Cannot renew capsule under active challenge")
        if new_expires_at_ms <= now:
            raise gl.vm.UserError("new_expires_at_ms must be in the future")

        if additional_bond_wei > 0:
            capsule["bond_amount"] = capsule["bond_amount"] + additional_bond_wei
            capsule["active_bond"] = capsule["active_bond"] + additional_bond_wei
            capsule["bond_tier"]   = self._tier(capsule["bond_amount"])

        if updated_evidence_urls and updated_evidence_urls.strip() != "":
            capsule["public_evidence_urls"] = json.loads(updated_evidence_urls)

        capsule["expires_at"] = new_expires_at_ms
        capsule["status"]     = "active"
        self.capsules[capsule_id] = self._json(capsule)
        self._log(sender, {"type": "renew_capsule", "capsule_id": capsule_id, "ts": now})

    # ------------------------------------------------------------------
    # Endorsement
    # ------------------------------------------------------------------

    @gl.public.write
    def endorse_capsule(self, capsule_id: str, endorsement_bond_wei: int, note: str) -> str:
        self._require_not_paused()
        sender  = self._sender()
        now     = self._now()
        capsule = self._require_capsule(capsule_id)

        if capsule["owner"] == sender:
            raise gl.vm.UserError("Cannot endorse your own capsule")
        if capsule["status"] not in ("active", "upheld"):
            raise gl.vm.UserError("Cannot endorse capsule with status: " + capsule["status"])
        if capsule["expires_at"] <= now:
            raise gl.vm.UserError("Cannot endorse expired capsule")
        if endorsement_bond_wei < MIN_ENDORSEMENT:
            raise gl.vm.UserError("Endorsement bond must be at least " + str(MIN_ENDORSEMENT) + " wei")

        eid = self._next_id("END", "endorsement")
        endorsement = {
            "endorsement_id": eid,
            "capsule_id": capsule_id,
            "endorser": sender,
            "bond_wei": endorsement_bond_wei,
            "note": note,
            "status": "active",
            "created_at": now,
            "unlocked_at": "",
            "refund_claimed": False,
        }
        self.endorsements[eid] = self._json(endorsement)
        capsule["endorsement_count"] = capsule["endorsement_count"] + 1
        self.capsules[capsule_id] = self._json(capsule)
        self._append_list(self.capsule_endorsements, capsule_id, eid)
        self._append_list(self.endorser_index, sender, eid)
        self._log(sender, {"type": "endorse_capsule", "capsule_id": capsule_id, "endorsement_id": eid, "bond_wei": endorsement_bond_wei, "ts": now})
        return eid

    @gl.public.write
    def withdraw_endorsement(self, endorsement_id: str) -> None:
        self._require_not_paused()
        sender      = self._sender()
        now         = self._now()
        endorsement = self._require_endorsement(endorsement_id)

        if endorsement["endorser"] != sender:
            raise gl.vm.UserError("Only endorser can withdraw")
        if endorsement["status"] != "active":
            raise gl.vm.UserError("Endorsement is already " + endorsement["status"])

        capsule = self._require_capsule(endorsement["capsule_id"])
        if capsule["status"] == "challenged":
            raise gl.vm.UserError("Cannot withdraw endorsement while capsule is under active challenge")

        endorsement["status"]      = "withdrawn"
        endorsement["unlocked_at"] = str(now)
        self.endorsements[endorsement_id] = self._json(endorsement)

        capsule["endorsement_count"] = max(0, capsule["endorsement_count"] - 1)
        self.capsules[endorsement["capsule_id"]] = self._json(capsule)
        self._log(sender, {"type": "withdraw_endorsement", "endorsement_id": endorsement_id, "ts": now})

    @gl.public.write
    def claim_endorsement_refund(self, endorsement_id: str) -> None:
        self._require_not_paused()
        sender      = self._sender()
        endorsement = self._require_endorsement(endorsement_id)

        if endorsement["endorser"] != sender:
            raise gl.vm.UserError("Only endorser can claim refund")
        if endorsement.get("refund_claimed") == True:
            raise gl.vm.UserError("Refund already claimed")

        capsule = self._require_capsule(endorsement["capsule_id"])
        if capsule["status"] == "challenged":
            raise gl.vm.UserError("Cannot refund while capsule is under active challenge")

        endorsement["refund_claimed"] = True
        self.endorsements[endorsement_id] = self._json(endorsement)
        self._log(sender, {"type": "claim_refund", "endorsement_id": endorsement_id, "ts": self._now()})

    # ------------------------------------------------------------------
    # Challenge
    # ------------------------------------------------------------------

    @gl.public.write
    def open_challenge(
        self,
        capsule_id: str,
        challenge_type: str,
        challenge_summary: str,
        evidence_urls: str,
        challenge_bond_wei: int,
    ) -> str:
        self._require_not_paused()
        sender  = self._sender()
        now     = self._now()
        capsule = self._require_capsule(capsule_id)

        if challenge_type not in VALID_CHALLENGE_TYPE:
            raise gl.vm.UserError("Invalid challenge_type: " + challenge_type)
        self._require_non_empty(challenge_summary, "challenge_summary")

        urls: typing.List[str] = []
        if evidence_urls and evidence_urls.strip() != "":
            urls = json.loads(evidence_urls)
        if len(urls) == 0:
            raise gl.vm.UserError("Challenge requires at least one evidence URL")

        if challenge_bond_wei < MIN_CHALLENGE:
            raise gl.vm.UserError("Challenge bond must be at least " + str(MIN_CHALLENGE) + " wei")

        if capsule["status"] in ("retired", "slashed", "expired"):
            raise gl.vm.UserError("Cannot challenge a " + capsule["status"] + " capsule")

        chid = self._next_id("CHL", "challenge")
        challenge = {
            "challenge_id": chid,
            "capsule_id": capsule_id,
            "challenger": sender,
            "challenge_type": challenge_type,
            "challenge_summary": challenge_summary,
            "evidence_urls": urls,
            "challenge_bond": challenge_bond_wei,
            "status": "open",
            "verdict_id": "",
            "created_at": now,
            "resolved_at": "",
            "reward_claimed": False,
            "reward_status": "",
        }
        self.challenges[chid] = self._json(challenge)
        capsule["challenge_count"] = capsule["challenge_count"] + 1
        capsule["status"]          = "challenged"
        self.capsules[capsule_id] = self._json(capsule)
        self._append_list(self.capsule_challenges, capsule_id, chid)
        self._append_list(self.challenger_index, sender, chid)
        self._log(sender, {"type": "open_challenge", "capsule_id": capsule_id, "challenge_id": chid, "bond_wei": challenge_bond_wei, "ts": now})
        return chid

    @gl.public.write
    def request_challenge_verdict(self, challenge_id: str) -> None:
        self._require_not_paused()
        challenge = self._require_challenge(challenge_id)

        if challenge["status"] != "open":
            raise gl.vm.UserError("Challenge must be open, is: " + challenge["status"])

        capsule = self._require_capsule(challenge["capsule_id"])

        prev_verdict_text = ""
        if capsule.get("latest_verdict_id", "") != "":
            pv_raw = self.verdicts.get(capsule["latest_verdict_id"], "")
            if pv_raw != "":
                pv = self._load(pv_raw)
                prev_verdict_text = str(pv.get("verdict_status", "")) + " — " + str(pv.get("short_reason", ""))

        evidence_list           = "\n".join(capsule.get("public_evidence_urls", []))
        challenge_evidence_list = "\n".join(challenge.get("evidence_urls", []))
        endorsement_summary     = str(capsule["endorsement_count"]) + " active endorsements"

        capsule_json   = self._json({
            "title":            capsule["claim_title"],
            "claim":            capsule["claim_body"],
            "category":         capsule["category"],
            "scope_boundaries": capsule.get("scope_boundaries", ""),
        })
        challenge_json = self._json({
            "type":    challenge["challenge_type"],
            "summary": challenge["challenge_summary"],
        })

        def evaluate_once() -> str:
            prompt = (
                "You are a GenLayer reputation validator evaluating a challenge to a reputation capsule.\n\n"
                "Judge ONLY whether the specific capability claim is still trustworthy.\n"
                "Do NOT make global character judgments.\n"
                "Do NOT punish for issues unrelated to the exact claimed capability.\n"
                "Distinguish weak evidence from direct contradiction.\n"
                "Apply materiality — minor issues should not cause full slashing.\n\n"
                "=== CAPSULE ===\n"
                + capsule_json + "\n\n"
                "=== PUBLIC EVIDENCE (supporting the claim) ===\n"
                + (evidence_list if evidence_list else "(none submitted)") + "\n\n"
                "=== ENDORSEMENTS ===\n"
                + endorsement_summary + "\n\n"
                "=== CHALLENGE ===\n"
                + challenge_json + "\n\n"
                "=== CHALLENGE EVIDENCE (against the claim) ===\n"
                + (challenge_evidence_list if challenge_evidence_list else "(none submitted)") + "\n\n"
                "=== PREVIOUS VERDICT ===\n"
                + (prev_verdict_text if prev_verdict_text else "(none)") + "\n\n"
                'Return ONLY valid JSON matching this schema exactly:\n'
                '{"verdict_status":"<trustworthy|weakly_supported|overstated|contradicted|unverifiable|impersonation_risk|material_breach|invalid_challenge|insufficient_evidence>",'
                '"action":"<keep_active|downgrade|suspend|slash_partial|slash_full|expire_without_slash|dismiss_challenge>",'
                '"claim_alignment":"<full|partial|weak|none|contradicted>",'
                '"evidence_strength":"<high|medium|low|insufficient>",'
                '"materiality":"<high|medium|low|none>",'
                '"slash_bps":<integer 0-10000>,'
                '"confidence":<integer 0-100>,'
                '"short_reason":"<one sentence max 200 chars>"}'
            )
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            normalised = self._normalise_verdict_result(raw)
            return json.dumps(normalised, sort_keys=True)

        consensus_json = gl.eq_principle.prompt_comparative(
            evaluate_once,
            principle=(
                "Two reputation verdicts are equivalent if they reach the same overall outcome.\n\n"
                "Core outcome rules (must agree):\n"
                "- Both must either penalise the capsule (action = slash_partial, slash_full, suspend, downgrade) "
                "OR both must clear/dismiss it (action = keep_active, expire_without_slash, dismiss_challenge, invalid_challenge).\n"
                "- slash_bps may differ by up to 2000 basis points.\n"
                "- confidence may differ by up to 25 points.\n\n"
                "Minor fields like verdict_status, claim_alignment, evidence_strength, materiality, and "
                "short_reason wording do NOT need to match exactly as long as the core outcome agrees."
            ),
        )

        result = self._normalise_verdict_result(consensus_json)
        self._validate_verdict(result)

        vid = self._next_id("VRD", "verdict")
        now = self._now()
        verdict = {
            "verdict_id":       vid,
            "capsule_id":       challenge["capsule_id"],
            "challenge_id":     challenge_id,
            "verdict_status":   result["verdict_status"],
            "confidence":       int(result["confidence"]),
            "claim_alignment":  result["claim_alignment"],
            "evidence_strength":result["evidence_strength"],
            "materiality":      result["materiality"],
            "action":           result["action"],
            "slash_bps":        int(result["slash_bps"]),
            "short_reason":     result["short_reason"],
            "created_at":       now,
        }
        self.verdicts[vid] = self._json(verdict)
        challenge["status"]     = "verdict_pending"
        challenge["verdict_id"] = vid
        self.challenges[challenge_id] = self._json(challenge)
        capsule["latest_verdict_id"] = vid
        self.capsules[challenge["capsule_id"]] = self._json(capsule)

    @gl.public.write
    def resolve_challenge(self, challenge_id: str) -> None:
        self._require_not_paused()
        challenge = self._require_challenge(challenge_id)

        if challenge["status"] != "verdict_pending":
            raise gl.vm.UserError("Challenge must be in verdict_pending state, is: " + challenge["status"])

        verdict = self._require_verdict(challenge["verdict_id"])
        capsule = self._require_capsule(challenge["capsule_id"])

        action    = verdict["action"]
        slash_bps = int(verdict["slash_bps"])
        now       = self._now()

        status_map = {
            "keep_active":          "upheld",
            "downgrade":            "downgraded",
            "suspend":              "suspended",
            "slash_partial":        "slashed",
            "slash_full":           "slashed",
            "expire_without_slash": "expired",
            "dismiss_challenge":    "active",
        }
        capsule["status"] = status_map.get(action, "upheld")

        if slash_bps > 0 and action in ("slash_partial", "slash_full"):
            slash_bps_capped = min(slash_bps, 10000)
            active           = int(capsule["active_bond"])
            slashed          = (active * slash_bps_capped) // 10000
            slashed          = min(slashed, active)
            capsule["active_bond"]  = active - slashed
            self.protocol_reserve   = u256(int(self.protocol_reserve) + slashed)

        challenge["status"]      = "resolved"
        challenge["resolved_at"] = str(now)
        self.challenges[challenge_id] = self._json(challenge)
        self.capsules[challenge["capsule_id"]] = self._json(capsule)

        self._log(challenge["challenger"], {"type": "challenge_resolved", "challenge_id": challenge_id, "action": action, "ts": now})
        self._log(capsule["owner"], {"type": "capsule_verdict_applied", "capsule_id": challenge["capsule_id"], "action": action, "ts": now})

    @gl.public.write
    def claim_challenge_reward(self, challenge_id: str) -> None:
        self._require_not_paused()
        sender    = self._sender()
        challenge = self._require_challenge(challenge_id)

        if challenge["challenger"] != sender:
            raise gl.vm.UserError("Only challenger can claim reward")
        if challenge["status"] != "resolved":
            raise gl.vm.UserError("Challenge must be resolved first")
        if challenge.get("reward_claimed") == True:
            raise gl.vm.UserError("Reward already claimed")

        verdict = self._require_verdict(challenge["verdict_id"])
        action  = verdict["action"]

        if action in ("slash_partial", "slash_full", "suspend", "downgrade"):
            challenge["reward_status"] = "won"
        elif action in ("dismiss_challenge", "keep_active", "expire_without_slash"):
            self.protocol_reserve = u256(int(self.protocol_reserve) + int(challenge["challenge_bond"]))
            challenge["reward_status"] = "forfeited"
        else:
            challenge["reward_status"] = "returned"

        challenge["reward_claimed"] = True
        self.challenges[challenge_id] = self._json(challenge)
        self._log(sender, {"type": "claim_reward", "challenge_id": challenge_id, "status": challenge["reward_status"], "ts": self._now()})

    # ------------------------------------------------------------------
    # Bond withdrawal
    # ------------------------------------------------------------------

    @gl.public.write
    def withdraw_unlocked_bond(self, capsule_id: str, amount_wei: int) -> None:
        self._require_not_paused()
        sender  = self._sender()
        capsule = self._require_capsule(capsule_id)

        if capsule["owner"] != sender:
            raise gl.vm.UserError("Only owner can withdraw bond")
        if capsule["status"] == "challenged":
            raise gl.vm.UserError("Cannot withdraw during active challenge")
        if capsule["status"] not in ("retired", "expired", "upheld", "downgraded", "active"):
            raise gl.vm.UserError("Bond not withdrawable in status: " + capsule["status"])
        if amount_wei <= 0:
            raise gl.vm.UserError("amount_wei must be positive")
        if amount_wei > int(capsule["active_bond"]):
            raise gl.vm.UserError("Cannot withdraw " + str(amount_wei) + ": only " + str(capsule["active_bond"]) + " available")

        capsule["active_bond"] = int(capsule["active_bond"]) - amount_wei
        self.capsules[capsule_id] = self._json(capsule)
        self._log(sender, {"type": "withdraw_bond", "capsule_id": capsule_id, "amount_wei": amount_wei, "ts": self._now()})

    # ------------------------------------------------------------------
    # Owner functions
    # ------------------------------------------------------------------

    @gl.public.write
    def pause(self) -> None:
        self._require_owner()
        self.paused = True

    @gl.public.write
    def unpause(self) -> None:
        self._require_owner()
        self.paused = False

    @gl.public.write
    def transfer_ownership(self, new_owner: str) -> None:
        self._require_owner()
        self._require_non_empty(new_owner, "new_owner")
        self.owner = new_owner.lower()

    # ------------------------------------------------------------------
    # Read functions
    # ------------------------------------------------------------------

    @gl.public.view
    def get_capsule(self, capsule_id: str) -> str:
        capsule = self._require_capsule(capsule_id)
        filtered = {k: v for k, v in capsule.items() if k != "private_evidence_commitment_hash"}
        return self._json(filtered)

    @gl.public.view
    def get_capsule_owner_view(self, capsule_id: str, requester: str) -> str:
        capsule = self._require_capsule(capsule_id)
        if capsule["owner"] != requester.lower():
            raise gl.vm.UserError("Not authorised: not capsule owner")
        return self._json(capsule)

    @gl.public.view
    def get_public_capsules(self, offset: int, limit: int) -> str:
        ids    = json.loads(self.public_capsule_ids)
        sliced = ids[offset: offset + limit]
        result = []
        for cid in sliced:
            raw = self.capsules.get(cid, "")
            if raw != "":
                c = self._load(raw)
                if c.get("visibility_mode") == "public":
                    result.append({
                        "capsule_id":         c["capsule_id"],
                        "owner":              c["owner"],
                        "claim_title":        c["claim_title"],
                        "category":           c["category"],
                        "bond_tier":          c["bond_tier"],
                        "bond_amount":        c["bond_amount"],
                        "active_bond":        c["active_bond"],
                        "status":             c["status"],
                        "endorsement_count":  c["endorsement_count"],
                        "challenge_count":    c["challenge_count"],
                        "latest_verdict_id":  c["latest_verdict_id"],
                        "expires_at":         c["expires_at"],
                        "created_at":         c["created_at"],
                    })
        return self._json(result)

    @gl.public.view
    def get_capsules_by_owner(self, owner_address: str) -> str:
        raw = self.owner_capsules.get(owner_address.lower(), "")
        if raw == "":
            return "[]"
        ids    = json.loads(raw)
        result = []
        for cid in ids:
            cap_raw = self.capsules.get(cid, "")
            if cap_raw != "":
                result.append(self._load(cap_raw))
        return self._json(result)

    @gl.public.view
    def get_capsule_challenges(self, capsule_id: str) -> str:
        raw = self.capsule_challenges.get(capsule_id, "")
        if raw == "":
            return "[]"
        ids    = json.loads(raw)
        result = []
        for cid in ids:
            raw_c = self.challenges.get(cid, "")
            if raw_c != "":
                c = self._load(raw_c)
                result.append({
                    "challenge_id":     c["challenge_id"],
                    "capsule_id":       c["capsule_id"],
                    "challenger":       c["challenger"],
                    "challenge_type":   c["challenge_type"],
                    "challenge_summary":c["challenge_summary"],
                    "evidence_urls":    c["evidence_urls"],
                    "challenge_bond":   c["challenge_bond"],
                    "status":           c["status"],
                    "verdict_id":       c.get("verdict_id", ""),
                    "created_at":       c["created_at"],
                    "resolved_at":      c.get("resolved_at", ""),
                    "reward_claimed":   c.get("reward_claimed", False),
                    "reward_status":    c.get("reward_status", ""),
                })
        return self._json(result)

    @gl.public.view
    def get_capsule_endorsements(self, capsule_id: str) -> str:
        raw = self.capsule_endorsements.get(capsule_id, "")
        if raw == "":
            return "[]"
        ids    = json.loads(raw)
        result = []
        for eid in ids:
            raw_e = self.endorsements.get(eid, "")
            if raw_e != "":
                e = self._load(raw_e)
                result.append({
                    "endorsement_id": e["endorsement_id"],
                    "capsule_id":     e["capsule_id"],
                    "endorser":       e["endorser"],
                    "bond_wei":       e["bond_wei"],
                    "note":           e.get("note", ""),
                    "status":         e["status"],
                    "created_at":     e["created_at"],
                    "refund_claimed": e.get("refund_claimed", False),
                })
        return self._json(result)

    @gl.public.view
    def get_verdict(self, verdict_id: str) -> str:
        raw = self.verdicts.get(verdict_id, "")
        if raw == "":
            raise gl.vm.UserError("Verdict not found: " + verdict_id)
        return raw

    @gl.public.view
    def get_endorser_dashboard(self, endorser_address: str) -> str:
        raw = self.endorser_index.get(endorser_address.lower(), "")
        if raw == "":
            return "[]"
        ids    = json.loads(raw)
        result = []
        for eid in ids:
            end_raw = self.endorsements.get(eid, "")
            if end_raw != "":
                result.append(self._load(end_raw))
        return self._json(result)

    @gl.public.view
    def get_challenger_dashboard(self, challenger_address: str) -> str:
        raw = self.challenger_index.get(challenger_address.lower(), "")
        if raw == "":
            return "[]"
        ids    = json.loads(raw)
        result = []
        for cid in ids:
            chl_raw = self.challenges.get(cid, "")
            if chl_raw != "":
                result.append(self._load(chl_raw))
        return self._json(result)

    @gl.public.view
    def get_wallet_activity(self, address: str, limit: int) -> str:
        raw = self.wallet_activity.get(address.lower(), "")
        if raw == "":
            return "[]"
        lst = json.loads(raw)
        return self._json(lst[:limit])

    @gl.public.view
    def get_contract_summary(self) -> str:
        return self._json({
            "owner":              self.owner,
            "contract_version":   self.contract_version,
            "paused":             self.paused,
            "capsule_counter":    str(self.capsule_counter),
            "endorsement_counter":str(self.endorsement_counter),
            "challenge_counter":  str(self.challenge_counter),
            "verdict_counter":    str(self.verdict_counter),
        })

    @gl.public.view
    def get_admin_monitor_stats(self) -> str:
        ids             = json.loads(self.public_capsule_ids)
        total_capsules  = int(self.capsule_counter)
        total_bonded    = 0
        active_capsules = 0
        active_disputes = 0

        for cid in ids:
            raw = self.capsules.get(cid, "")
            if raw != "":
                c = self._load(raw)
                total_bonded    += int(c.get("active_bond", 0))
                if c["status"] == "active":    active_capsules += 1
                if c["status"] == "challenged": active_disputes += 1

        total_chal_bond  = 0
        pending_verdicts = 0
        for i in range(1, int(self.challenge_counter) + 1):
            raw = self.challenges.get("CHL-" + str(i), "")
            if raw != "":
                c = self._load(raw)
                total_chal_bond  += int(c.get("challenge_bond", 0))
                if c["status"] == "verdict_pending":
                    pending_verdicts += 1

        return self._json({
            "total_capsules":            total_capsules,
            "active_capsules":           active_capsules,
            "total_bonded_wei":          total_bonded,
            "total_challenge_bonds_wei": total_chal_bond,
            "active_disputes":           active_disputes,
            "pending_verdicts":          pending_verdicts,
            "stuck_withdrawals":         0,
            "protocol_reserve_wei":      int(self.protocol_reserve),
            "contract_version":          self.contract_version,
            "owner":                     self.owner,
        })
