import MovieDetails from '@app/components/MovieDetails';
import defineMessages from '@app/utils/defineMessages';
import { useIntl } from 'react-intl';
import type { MovieDetails as MovieDetailsType } from '@server/models/Movie';
import type { GetServerSideProps, NextPage } from 'next';
import Alert from '@app/components/Common/Alert';

const messages = defineMessages('pages', {
  moviecontentRestricted: 'Content Restricted',
  movieContentRestrictedDescription: 'This content is not available based on your content rating settings.',
});

interface MoviePageProps {
  movie?: MovieDetailsType;
  error?: {
    status: number;
    message: string;
    mediaInfo?: {
      title: string;
      type: 'movie' | 'tv';
      blocked: boolean;
    };
  };
}

const MoviePage: NextPage<MoviePageProps> = ({ movie, error }) => {
  const intl = useIntl();
  // Handle blocked content
  if (error?.status === 403 && error?.mediaInfo?.blocked) {
    return (
      <div className="page">
        <div className="container mx-auto">
          <Alert
            title={error.mediaInfo?.title ?? intl.formatMessage(messages.moviecontentRestricted)}
            type="error"
          >
            <div className="text-sm">
              <p className="mt-2">
                {intl.formatMessage(messages.movieContentRestrictedDescription)}
              </p>
            </div>
          </Alert>
        </div>
      </div>
    );
  }

  return <MovieDetails movie={movie} />;
};

export const getServerSideProps: GetServerSideProps<MoviePageProps> = async (
  ctx
) => {
  const res = await fetch(
    `http://localhost:${process.env.PORT || 5055}/api/v1/movie/${
      ctx.query.movieId
    }`,
    {
      headers: ctx.req?.headers?.cookie
        ? { cookie: ctx.req.headers.cookie }
        : undefined,
    }
  );
  if (!res.ok) {
    if (res.status === 403) {
      const data = await res.json();
      return {
        props: {
          error: {
            status: res.status,
            message: data.message,
            mediaInfo: data.mediaInfo,
          },
        },
      };
    }
    throw new Error();
  }
  const movie: MovieDetailsType = await res.json();

  return {
    props: {
      movie,
    },
  };
};

export default MoviePage;
