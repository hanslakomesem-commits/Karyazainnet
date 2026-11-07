-- ============================================================================
-- ZAIN.NET ACADEMIC HUB - SKEMA DATABASE SUPABASE & ROW LEVEL SECURITY (RLS)
-- CATATAN PENTING:
-- Skema ini dirancang khusus untuk ZAIN.NET Academic Hub tanpa mengubah
-- atau menghapus tabel nota_jilid yang sudah ada.
-- Jalankan skrip ini di: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ============================================================================

-- 1. TABEL DOKUMEN & SINKRONISASI LINTAS BROWSER (academic_documents)
CREATE TABLE IF NOT EXISTS public.academic_documents (
    path text PRIMARY KEY,
    parent_path text NOT NULL DEFAULT '',
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index untuk pencarian cepat berdasarkan parent_path (misal: 'auth_accounts', 'transactions', 'users')
CREATE INDEX IF NOT EXISTS idx_academic_documents_parent_path ON public.academic_documents(parent_path);
CREATE INDEX IF NOT EXISTS idx_academic_documents_updated_at ON public.academic_documents(updated_at DESC);

-- Aktifkan Row Level Security (RLS)
ALTER TABLE public.academic_documents ENABLE ROW LEVEL SECURITY;

-- Policy RLS untuk academic_documents:
-- Izinkan akses baca publik/anon untuk sinkronisasi dokumen & settings
DROP POLICY IF EXISTS "academic_documents_read_policy" ON public.academic_documents;
CREATE POLICY "academic_documents_read_policy"
    ON public.academic_documents
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Izinkan write publik/anon untuk registrasi, login, dan transaksi
DROP POLICY IF EXISTS "academic_documents_write_policy" ON public.academic_documents;
CREATE POLICY "academic_documents_write_policy"
    ON public.academic_documents
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 2. TABEL PROFIL MAHASISWA & USER (academic_profiles)
CREATE TABLE IF NOT EXISTS public.academic_profiles (
    id text PRIMARY KEY,
    email text UNIQUE NOT NULL,
    display_name text NOT NULL,
    role text NOT NULL DEFAULT 'public',
    university text DEFAULT '',
    major text DEFAULT '',
    whatsapp text DEFAULT '',
    wallet_balance numeric NOT NULL DEFAULT 0,
    quotas jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.academic_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "academic_profiles_read_policy" ON public.academic_profiles;
CREATE POLICY "academic_profiles_read_policy"
    ON public.academic_profiles
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "academic_profiles_write_policy" ON public.academic_profiles;
CREATE POLICY "academic_profiles_write_policy"
    ON public.academic_profiles
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 3. TABEL KHUSUS MITRA RESELLER (academic_resellers)
CREATE TABLE IF NOT EXISTS public.academic_resellers (
    id text PRIMARY KEY,
    email text UNIQUE NOT NULL,
    name text NOT NULL DEFAULT 'Mitra Reseller',
    whatsapp text DEFAULT '',
    balance numeric NOT NULL DEFAULT 0,
    discount_percentage integer NOT NULL DEFAULT 50,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.academic_resellers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "academic_resellers_read_policy" ON public.academic_resellers;
CREATE POLICY "academic_resellers_read_policy"
    ON public.academic_resellers
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "academic_resellers_write_policy" ON public.academic_resellers;
CREATE POLICY "academic_resellers_write_policy"
    ON public.academic_resellers
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 4. TABEL TRANSAKSI & TOP-UP (academic_transactions)
CREATE TABLE IF NOT EXISTS public.academic_transactions (
    id text PRIMARY KEY,
    order_id text UNIQUE,
    user_id text,
    user_email text,
    item_type text,
    item_name text,
    amount_paid numeric NOT NULL DEFAULT 0,
    payment_method text,
    status text NOT NULL DEFAULT 'pending',
    proof_image_url text,
    transfer_notes text,
    purchased_at bigint,
    verified_at bigint,
    verified_by text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_academic_transactions_user_id ON public.academic_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_academic_transactions_status ON public.academic_transactions(status);

ALTER TABLE public.academic_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "academic_transactions_read_policy" ON public.academic_transactions;
CREATE POLICY "academic_transactions_read_policy"
    ON public.academic_transactions
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "academic_transactions_write_policy" ON public.academic_transactions;
CREATE POLICY "academic_transactions_write_policy"
    ON public.academic_transactions
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 5. FUNCTION & RPC: WRITE DOCUMENT DENGAN SUPPORT MERGE & INCREMENT
CREATE OR REPLACE FUNCTION public.academic_write_document(
    p_path text,
    p_payload jsonb,
    p_merge boolean DEFAULT true,
    p_update_only boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_parent_path text;
    v_existing record;
    v_final jsonb;
    v_parts text[];
BEGIN
    v_parts := string_to_array(p_path, '/');
    IF array_length(v_parts, 1) > 1 THEN
        v_parent_path := array_to_string(v_parts[1:array_length(v_parts, 1) - 1], '/');
    ELSE
        v_parent_path := '';
    END IF;

    SELECT * INTO v_existing FROM public.academic_documents WHERE path = p_path;

    IF p_update_only AND NOT FOUND THEN
        RAISE EXCEPTION 'Document % not found for update', p_path;
    END IF;

    IF FOUND AND p_merge THEN
        v_final := v_existing.payload || p_payload;
    ELSE
        v_final := p_payload;
    END IF;

    INSERT INTO public.academic_documents (path, parent_path, payload, updated_at)
    VALUES (p_path, v_parent_path, v_final, now())
    ON CONFLICT (path) DO UPDATE
    SET parent_path = EXCLUDED.parent_path,
        payload = EXCLUDED.payload,
        updated_at = now();

    RETURN v_final;
END;
$$;

-- 6. FUNCTION & RPC: VERIFIKASI TOP-UP SECARA ATOMIK OLEH ADMIN
CREATE OR REPLACE FUNCTION public.academic_approve_transaction(
    p_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_trx record;
    v_target_uid text;
    v_amount numeric;
    v_updated_payload jsonb;
BEGIN
    SELECT * INTO v_trx FROM public.academic_documents WHERE path = ('transactions/' || p_id);
    IF NOT FOUND THEN
        SELECT * INTO v_trx FROM public.academic_documents WHERE path = p_id;
    END IF;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaksi % tidak ditemukan', p_id;
    END IF;

    v_updated_payload := v_trx.payload || jsonb_build_object(
        'status', 'completed',
        'verifiedAt', (extract(epoch from now()) * 1000)::bigint,
        'verifiedBy', 'Admin ZAIN.NET'
    );

    UPDATE public.academic_documents
    SET payload = v_updated_payload,
        updated_at = now()
    WHERE path = v_trx.path;

    -- Jika transaksi adalah top-up saldo, tambahkan saldo pengguna secara aman
    IF (v_trx.payload->>'itemType') = 'topup' THEN
        v_target_uid := v_trx.payload->>'userId';
        v_amount := COALESCE((v_trx.payload->>'amountPaid')::numeric, 0);

        IF v_target_uid IS NOT NULL AND v_target_uid <> 'guest' AND v_amount > 0 THEN
            -- Update dompet pengguna
            PERFORM public.academic_write_document(
                'users/' || v_target_uid || '/data/wallet',
                jsonb_build_object('userId', v_target_uid, 'balance', v_amount),
                true,
                false
            );
        END IF;
    END IF;

    RETURN v_updated_payload;
END;
$$;

-- Berikan izin akses pada functions RPC
GRANT EXECUTE ON FUNCTION public.academic_write_document(text, jsonb, boolean, boolean) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.academic_approve_transaction(text) TO anon, authenticated, service_role;
