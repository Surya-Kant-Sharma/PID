import "./App.css";

import {
  IdentityStorage,
  CredentialStorage,
  BjjProvider,
  KmsKeyType,
  IdentityWallet,
  CredentialWallet,
  KMS,
  CredentialStatusType,
  InMemoryDataSource,
  InMemoryMerkleTreeStorage,
  EthStateStorage,
  CredentialStatusResolverRegistry,
  IssuerResolver,
  RHSResolver,
  OnChainResolver,
  defaultEthConnectionConfig,
  AgentResolver,
  InMemoryPrivateKeyStore,
  IndexedDBPrivateKeyStore,
  IndexedDBDataSource,
  MerkleTreeIndexedDBStorage,
  core,
} from "@0xpolygonid/js-sdk";

function App() {
  async function createWallet() {
    const keyStore = new IndexedDBPrivateKeyStore();
    const bjjProvider = new BjjProvider(KmsKeyType.BabyJubJub, keyStore);
    const kms = new KMS();
    kms.registerKeyProvider(KmsKeyType.BabyJubJub, bjjProvider);
    let dataStorage = {
      credential: new CredentialStorage(
        new IndexedDBDataSource(CredentialStorage.storageKey)
      ),
      identity: new IdentityStorage(
        new IndexedDBDataSource(IdentityStorage.identitiesStorageKey),
        new IndexedDBDataSource(IdentityStorage.profilesStorageKey)
      ),
      mt: new MerkleTreeIndexedDBStorage(40),
      states: new EthStateStorage(defaultEthConnectionConfig),
    };
    const credWallet = new CredentialWallet(dataStorage);
    let wallet = new IdentityWallet(kms, dataStorage, credWallet);

    return {
      wallet: wallet,
      credWallet: credWallet,
      kms: kms,
      dataStorage: dataStorage,
    };
  }

  function initDataStorage() {
    let conf = defaultEthConnectionConfig;
    conf.contractAddress = "0x624ce98D2d27b20b8f8d521723Df8fC4db71D79D";
    conf.url = "https://polygon-mainnet.g.alchemy.com/v2/P7Z47VdHTMNYzD5YQfM3-qxaZ0vlx90T";

    var dataStorage = {
      credential: new CredentialStorage(new InMemoryDataSource()),
      identity: new IdentityStorage(
        new InMemoryDataSource(),
        new InMemoryDataSource()
      ),
      mt: new InMemoryMerkleTreeStorage(40),

      states: new EthStateStorage(defaultEthConnectionConfig),
    };
    return dataStorage;
  }

  async function initCredentialWallet(dataStorage) {
    const resolvers = new CredentialStatusResolverRegistry();
    resolvers.register(
      CredentialStatusType.SparseMerkleTreeProof,
      new IssuerResolver()
    );
    resolvers.register(
      CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
      new RHSResolver(dataStorage.states)
    );
    resolvers.register(
      CredentialStatusType.Iden3OnchainSparseMerkleTreeProof2023,
      new OnChainResolver([defaultEthConnectionConfig])
    );
    resolvers.register(
      CredentialStatusType.Iden3commRevocationStatusV1,
      new AgentResolver()
    );

    return new CredentialWallet(dataStorage, resolvers);
  }

  async function initIdentityWallet(dataStorage, credentialWallet) {
    const memoryKeyStore = new InMemoryPrivateKeyStore();
    const bjjProvider = new BjjProvider(KmsKeyType.BabyJubJub, memoryKeyStore);
    const kms = new KMS();
    kms.registerKeyProvider(KmsKeyType.BabyJubJub, bjjProvider);

    return new IdentityWallet(kms, dataStorage, credentialWallet);
  }

  async function identityCreation() {
    console.log("=============== key creation ===============");

    const dataStorage = initDataStorage();
    const credentialWallet = await initCredentialWallet(dataStorage);
    const identityWallet = await initIdentityWallet(
      dataStorage,
      credentialWallet
    );

    const { wallet } = await createWallet();

    const { did, credential } = await wallet.createIdentity({
      method: core.DidMethod.Iden3,
      blockchain: core.Blockchain.Polygon,
      networkId: core.NetworkId.Main,
      revocationOpts: {
        type: CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
        id: "https://rhs-staging.polygonid.me",
      },
    });

    console.log("=============== did ===============");
    console.log(did.string());
    console.log("=============== Auth BJJ credential ===============");
    console.log(JSON.stringify(credential));
  }

  return (
    <div className="App">
      <div className="App-header">

      <button
        style={{ width: 100, height: 30, marginTop: 20, cursor : "pointer" }}
        onClick={() => {
          identityCreation();
        }}
      >
        Create DID
      </button>
      </div>
    </div>
  );
}

export default App;
