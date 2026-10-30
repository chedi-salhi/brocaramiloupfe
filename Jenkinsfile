// Pipeline Jenkins de DÉPLOIEMENT (CD) — complète la CI GitHub Actions
// (.github/workflows/ci.yml) sans la dupliquer :
//   - GitHub Actions : tests, analyse de qualité, build et publication des
//     images sur Docker Hub (intégration continue).
//   - Jenkins (ce fichier) : récupère les images publiées et redéploie le
//     backend et le frontend (livraison/déploiement continu).
// Aucun build ni test ici : tout cela a déjà été fait par GitHub Actions.
pipeline {
  agent any

  parameters {
    string(
      name: 'IMAGE_TAG',
      defaultValue: 'latest',
      description: 'Tag des images Docker Hub à déployer (latest, ou le SHA d\'un commit pour revenir à une version précise)'
    )
    string(
      name: 'COMPOSE_PROJECT',
      defaultValue: 'brocaramiloupfe',
      description: 'Nom du projet Docker Compose du stack existant (voir "docker compose ls" sur la machine)'
    )
  }

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  environment {
    // Expose DOCKERHUB_CREDENTIALS_USR et DOCKERHUB_CREDENTIALS_PSW
    DOCKERHUB_CREDENTIALS = credentials('dockerhub-credentials')
    // Valeurs par défaut : au tout premier build d'un job, Jenkins n'a pas
    // encore enregistré les paramètres déclarés ci-dessus (ils restent vides).
    IMAGE_TAG = "${params.IMAGE_TAG ?: 'latest'}"
    COMPOSE_PROJECT = "${params.COMPOSE_PROJECT ?: 'brocaramiloupfe'}"
  }

  stages {
    stage('Préparer la configuration') {
      steps {
        // Les fichiers .env contiennent des secrets : ils ne sont pas dans Git,
        // Jenkins les fournit via des credentials de type "Secret file".
        withCredentials([
          file(credentialsId: 'backend-env', variable: 'BACKEND_ENV'),
          file(credentialsId: 'frontend-env', variable: 'FRONTEND_ENV')
        ]) {
          sh '''
            mkdir -p deploy
            cp "$BACKEND_ENV" deploy/backend.env
            cp "$FRONTEND_ENV" deploy/frontend.env
          '''
        }
      }
    }

    stage('Récupérer les images') {
      steps {
        sh 'echo "$DOCKERHUB_CREDENTIALS_PSW" | docker login -u "$DOCKERHUB_CREDENTIALS_USR" --password-stdin'
        sh '''
          export DOCKERHUB_USER="$DOCKERHUB_CREDENTIALS_USR"
          docker compose -p "${COMPOSE_PROJECT}" -f docker-compose.deploy.yml pull
        '''
      }
    }

    stage('Déployer') {
      steps {
        // --no-deps : ne touche ni à la base, ni à Keycloak, ni à la supervision.
        sh '''
          export DOCKERHUB_USER="$DOCKERHUB_CREDENTIALS_USR"
          docker compose -p "${COMPOSE_PROJECT}" -f docker-compose.deploy.yml up -d --no-deps backend frontend
        '''
      }
    }

    stage('Vérifier le déploiement') {
      steps {
        // Le backend applique ses migrations au démarrage et Next.js met
        // quelques secondes à écouter : on réessaie chaque service jusqu'à
        // ce qu'il réponde (2 minutes maximum). 127.0.0.1 et non localhost : dans
        // le conteneur Alpine, "localhost" se résout d'abord en IPv6 (::1), alors
        // que Next.js n'écoute qu'en IPv4 (HOSTNAME=0.0.0.0).
        sh '''
          check() {
            service="$1"; url="$2"
            for i in $(seq 1 24); do
              if docker compose -p "${COMPOSE_PROJECT}" -f docker-compose.deploy.yml exec -T "$service" wget -q --spider "$url"; then
                echo "$service opérationnel"
                return 0
              fi
              sleep 5
            done
            echo "$service ne répond pas après le déploiement" >&2
            return 1
          }
          check backend http://127.0.0.1:3001/metrics
          check frontend http://127.0.0.1:3000
        '''
      }
    }
  }

  post {
    always {
      // Ne pas laisser les secrets dans le workspace Jenkins.
      sh 'rm -rf deploy'
      sh 'docker logout || true'
    }
    success { echo "Déploiement réussi (tag ${env.IMAGE_TAG})." }
    failure { echo 'Déploiement échoué : voir les logs ci-dessus.' }
  }
}
