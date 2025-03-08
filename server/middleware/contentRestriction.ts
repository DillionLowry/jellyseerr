import type { NextFunction, Request, Response } from 'express';
import type { User } from '@server/entity/User';
import type {
  TmdbMovieDetails,
  TmdbTvDetails,
  TmdbRelease,
  TmdbRating
} from '@server/api/themoviedb/interfaces';
//import { movieCertifications, tvCertifications} from '@server/models/certifications';

//function exceedsCertificationLimit(
//  contentCert: string | undefined | null,
//  maxCert: string | undefined | null,
//  certificationList: { certification: string; order: number }[]
//): boolean {
//  // If no restrictions are set, allow all content
//  if (!maxCert) return false;

//  // If content has no certification
//  if (!contentCert || contentCert === 'NR' || contentCert === 'Unrated') {
//    return false; // This will be handled by the allowUnrated flag
//  }

//  const contentCertObj = certificationList.find(c => c.certification === contentCert);
//  const maxCertObj = certificationList.find(c => c.certification === maxCert);

//  // If we can't find either certification in our list, be cautious and block
//  if (!contentCertObj || !maxCertObj) return true;

//  // Compare order values (higher = more restrictive)
//  return contentCertObj.order > maxCertObj.order;
//}

function isMediaPath(path: string): { isMedia: boolean; mediaType?: 'movie' | 'tv' } {
  // Only intercept direct media access paths, not discovery/list endpoints
  //  if (path.match(/^\/(movie|tv)\/\d+(?:\/(?:recommendations|similar))?$/)) {
  if (path.match(/^\/(movie|tv)\/\d+$/)) {
    return {
      isMedia: true,
      mediaType: path.includes('/movie/') ? 'movie' : 'tv'
    };
  }

  return { isMedia: false };
}
function shouldBlockContent(
  content: TmdbMovieDetails | TmdbTvDetails,
  user: User,
  isMovie: boolean
): boolean {
  if (!user.settings?.enableCertificationRestrictions) return false;

  const allowedCerts = isMovie
    ? user.settings.getAllowedMovieCertifications()
    : user.settings.getAllowedTvCertifications();

  let contentCert: string | undefined;

  if (isMovie) {
    const snakeCaseRating = (content as TmdbMovieDetails).release_dates?.results?.find(
      (r: TmdbRelease) => r.iso_3166_1 === 'US'
    )?.release_dates?.[0]?.certification;
   
    const camelCaseRating = (content as any).releaseDates?.results?.find(
      (r: TmdbRelease) => r.iso_3166_1 === 'US'
    )?.release_dates?.[0]?.certification;

    contentCert = snakeCaseRating ?? camelCaseRating;
  } else {
    const snakeCaseRating = (content as TmdbTvDetails).content_ratings?.results?.find(
      (r: TmdbRating) => r.iso_3166_1 === 'US'
    )?.rating;

    const camelCaseRating = (content as any).contentRatings?.results?.find(
      (r: TmdbRating) => r.iso_3166_1 === 'US'
    )?.rating;

    contentCert = snakeCaseRating ?? camelCaseRating;
  }

  console.log('Content type:', isMovie ? 'movie' : 'tv');
  console.log('Allowed certifications:', allowedCerts);
  console.log('Content certification:', contentCert);
  //console.log('Raw content:', JSON.stringify(content, null, 2));

  if (allowedCerts.length > 0 && !allowedCerts.includes(contentCert ?? 'NR')) {
    return true;
  }
  return false;
}

function applyContentRestrictions(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Skip middleware if user has no restrictions enabled
  if (!req.user?.settings?.enableCertificationRestrictions) {
    return next();
  }

  const pathInfo = isMediaPath(req.path);

  // Only apply restriction to direct media access routes
  if (pathInfo.isMedia) {
    const originalJson = res.json;

    res.json = function (data) {
      if (req.user && shouldBlockContent(data, req.user, pathInfo.mediaType === 'movie')) {
        res.status(403);
        return originalJson.call(this, {
          ...data,
          status: 403,
          mediaInfo: {
            title: data.title || data.name,
            type: pathInfo.mediaType,
            blocked: true
          },
          message: 'This content exceeds your content rating restrictions'
        });
      }

      return originalJson.call(this, data);
    };
  }

  next();
}

export default applyContentRestrictions;
