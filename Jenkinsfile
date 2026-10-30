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
          export IMAGE_TAG="${IMAGE_TAG}"
          docker compose -p "${COMPOSE_PROJECT}" -f docker-compose.deploy.yml pull
        '''
      }
    }

    stage('Déployer') {
      steps {
        // --no-deps : ne touche ni à la base, ni à Keycloak, ni à la supervision.
        sh '''
          export DOCKERHUB_USER="$DOCKERHUB_CREDENTIALS_USR"
          export IMAGE_TAG="${IMAGE_TAG}"
          docker compose -p "${COMPOSE_PROJECT}" -f docker-compose.deploy.yml up -d --no-deps backend frontend
        '''
      }
    }

    stage('Vérifier le déploiement') {
      steps {
        // Le backend applique ses migrations au démarrage : on attend qu'il réponde.
        sh '''
          for i in $(seq 1 24); do
            if docker compose -p "${COMPOSE_PROJECT}" -f docker-compose.deploy.yml exec -T backend wget -q --spider http://localhost:3001/metrics; then
              echo "Backend opérationnel"
              break
            fi
            if [ "$i" = "24" ]; then
              echo "Le backend ne répond pas après le déploiement" >&2
              exit 1
            fi
            sleep 5
          done
          docker compose -p "${COMPOSE_PROJECT}" -f docker-compose.deploy.yml exec -T frontend wget -q --spider http://localhost:3000
          echo "Frontend opérationnel"
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
    success { echo "Déploiement réussi (tag ${params.IMAGE_TAG})." }
    failure { echo 'Déploiement échoué : voir les logs ci-dessus.' }
  }
}
